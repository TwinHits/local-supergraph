import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/renderer/api";
import {
  type DatabaseCatalog,
  type DatabaseConnectionInfo,
  DatabaseConnectionState,
  type DatabaseRowState,
  type LocalPortMap,
} from "@/shared/databases/databases.types";
import { type Diagnosis } from "@/shared/errors/errors.types";

const STATE_POLL_MS = 1000;

export type DatabaseRow = {
  name: string;
  state: DatabaseConnectionState;
  localPort: number;
};

/** Every environment named by any database in the catalog, in the order first seen. */
function everyEnvironment(catalog: DatabaseCatalog): string[] {
  const seen = new Set<string>();
  for (const environments of Object.values(catalog)) {
    for (const each of environments) {
      seen.add(each);
    }
  }
  return [...seen];
}

/** Reads the database catalog, drives every row's connection, and polls real state. */
export function useDatabases() {
  const [catalog, setCatalog] = useState<DatabaseCatalog>({});
  const [environment, setEnvironment] = useState("");
  const [statuses, setStatuses] = useState<Record<string, DatabaseRowState>>(
    {}
  );
  const [localPorts, setLocalPorts] = useState<LocalPortMap>({});
  const [errors, setErrors] = useState<Diagnosis[]>([]);
  const [connectionInfoByName, setConnectionInfoByName] = useState<
    Record<string, DatabaseConnectionInfo | null>
  >({});

  // A ref, not `statuses` itself, so selectEnvironment keeps a stable
  // identity across polls instead of re-running the mount-only catalog effect.
  const statusesRef = useRef(statuses);
  useEffect(
    function syncStatusesRef() {
      statusesRef.current = statuses;
    },
    [statuses]
  );

  const selectEnvironment = useCallback(function change(name: string) {
    const connected = Object.keys(statusesRef.current).filter(
      function isConnected(database) {
        return (
          statusesRef.current[database].state !==
          DatabaseConnectionState.Disconnected
        );
      }
    );

    void Promise.all(
      connected.map(function disconnectOne(database) {
        return api.databases.disconnect(database);
      })
    ).then(function applyDisconnects() {
      setStatuses(function clear(current) {
        const next = { ...current };
        connected.forEach(function markDisconnected(database) {
          next[database] = {
            state: DatabaseConnectionState.Disconnected,
            environment: null,
          };
        });
        return next;
      });
      void api.settings.updateEnvironment(name).then(setEnvironment);
    });
  }, []);

  useEffect(
    function loadCatalog() {
      void Promise.all([
        api.databases.catalog(),
        api.databases.localPorts(),
        api.settings.currentEnvironment(),
      ]).then(function apply([loaded, ports, current]) {
        setCatalog(loaded);
        setLocalPorts(ports);

        // Falls back to the config's first environment when nothing's been
        // picked yet, or the persisted pick no longer exists in the catalog.
        const offered = everyEnvironment(loaded);
        if (offered.length > 0 && !offered.includes(current)) {
          selectEnvironment(offered[0]);
        } else {
          setEnvironment(current);
        }
      });
    },
    [selectEnvironment]
  );

  useEffect(function pollState() {
    const interval = setInterval(function check() {
      void api.databases.statuses().then(setStatuses);
      void api.errors.databaseConnectionErrors().then(setErrors);
    }, STATE_POLL_MS);
    return function stop() {
      clearInterval(interval);
    };
  }, []);

  const connect = useCallback(
    function start(name: string) {
      void api.databases.connect(name, environment).then(function apply(state) {
        setStatuses(function merge(current) {
          return { ...current, [name]: { state, environment } };
        });
      });
    },
    [environment]
  );

  const disconnect = useCallback(function stop(name: string) {
    void api.databases.disconnect(name).then(function apply(state) {
      setStatuses(function merge(current) {
        return { ...current, [name]: { state, environment: null } };
      });
    });
  }, []);

  /** Whichever environment a row is connected under, else the toolbar's current pick. */
  const environmentFor = useCallback(
    function resolve(name: string) {
      return statuses[name]?.environment ?? environment;
    },
    [statuses, environment]
  );

  // Which environment each name's connection info was last fetched for, so a
  // row that later connects under a different environment gets refetched
  // instead of showing another environment's stale info.
  const fetchedEnvironmentByNameRef = useRef<Record<string, string>>({});
  useEffect(
    function loadConnectionInfoEagerly() {
      if (environment === "") {
        return;
      }
      Object.keys(catalog).forEach(function fetchOne(name) {
        const targetEnvironment = environmentFor(name);
        if (fetchedEnvironmentByNameRef.current[name] === targetEnvironment) {
          return;
        }
        fetchedEnvironmentByNameRef.current[name] = targetEnvironment;
        void api.databases
          .connectionInfo(name, targetEnvironment)
          .then(function apply(info) {
            setConnectionInfoByName(function merge(current) {
              return { ...current, [name]: info };
            });
          });
      });
    },
    [catalog, environment, environmentFor]
  );

  const updateLocalPort = useCallback(
    function change(name: string, port: number) {
      const targetEnvironment = environmentFor(name);
      void api.databases
        .updateLocalPort(name, targetEnvironment, port)
        .then(function apply(saved) {
          setLocalPorts(function merge(current) {
            return {
              ...current,
              [name]: { ...current[name], [targetEnvironment]: saved },
            };
          });
        });
    },
    [environmentFor]
  );

  const copyPassword = useCallback(
    function copy(name: string) {
      return api.databases.copyPasswordToClipboard(name, environmentFor(name));
    },
    [environmentFor]
  );

  const copyPasswordUrlEncoded = useCallback(
    function copy(name: string) {
      return api.databases.copyPasswordUrlEncodedToClipboard(
        name,
        environmentFor(name)
      );
    },
    [environmentFor]
  );

  const login = useCallback(
    function signIn(diagnosis: Diagnosis) {
      if (diagnosis.database === null) {
        return Promise.resolve(false);
      }
      return api.databases.ssoLogin(
        diagnosis.database,
        environmentFor(diagnosis.database)
      );
    },
    [environmentFor]
  );

  const rows: DatabaseRow[] = Object.keys(catalog)
    .filter(function hasEntryForEnvironmentOrIsConnected(name) {
      if (catalog[name].includes(environment)) {
        return true;
      }
      const status = statuses[name];
      return (
        status !== undefined &&
        status.state !== DatabaseConnectionState.Disconnected
      );
    })
    .map(function toRow(name) {
      return {
        name,
        state: statuses[name]?.state ?? DatabaseConnectionState.Disconnected,
        localPort: localPorts[name]?.[environmentFor(name)] ?? 0,
      };
    });

  return {
    environment,
    environments: everyEnvironment(catalog),
    selectEnvironment,
    rows,
    errors,
    connectionInfoByName,
    connect,
    disconnect,
    updateLocalPort,
    copyPassword,
    copyPasswordUrlEncoded,
    login,
  };
}
