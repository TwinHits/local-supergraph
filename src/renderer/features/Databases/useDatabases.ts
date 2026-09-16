import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import {
  type DatabaseCatalog,
  type DatabaseConnectionInfo,
  DatabaseConnectionState,
} from "@/shared/databases/databases.types";
import { type Diagnosis } from "@/shared/errors/errors.types";

const STATE_POLL_MS = 1000;

/** Reads the database catalog, drives one connection, and polls its real state. */
export function useDatabases() {
  const [catalog, setCatalog] = useState<DatabaseCatalog>({});
  const [database, setDatabase] = useState("");
  const [environment, setEnvironment] = useState("");
  const [connectionInfo, setConnectionInfo] =
    useState<DatabaseConnectionInfo | null>(null);
  const [state, setState] = useState(DatabaseConnectionState.Disconnected);
  const [errors, setErrors] = useState<Diagnosis[]>([]);

  useEffect(function loadSelection() {
    void api.databases.catalog().then(setCatalog);
    void Promise.all([
      api.databases.selectedDatabase(),
      api.databases.selectedEnvironment(),
    ]).then(function applySelection([savedDatabase, savedEnvironment]) {
      setDatabase(savedDatabase);
      setEnvironment(savedEnvironment);
    });
  }, []);

  useEffect(function pollState() {
    const interval = setInterval(function check() {
      void api.databases.status().then(setState);
      void api.errors.databaseConnectionErrors().then(setErrors);
    }, STATE_POLL_MS);
    return function stop() {
      clearInterval(interval);
    };
  }, []);

  useEffect(
    function loadConnectionInfo() {
      if (database === "" || environment === "") {
        return;
      }
      void api.databases
        .connectionInfo(database, environment)
        .then(setConnectionInfo);
    },
    [database, environment]
  );

  const activeConnectionInfo =
    database === "" || environment === "" ? null : connectionInfo;

  const selectDatabase = useCallback(function change(name: string) {
    void api.databases.updateSelectedDatabase(name).then(setDatabase);
  }, []);

  const selectEnvironment = useCallback(function change(name: string) {
    void api.databases.updateSelectedEnvironment(name).then(setEnvironment);
  }, []);

  const connect = useCallback(
    function start() {
      void api.databases.connect(database, environment).then(setState);
    },
    [database, environment]
  );

  const disconnect = useCallback(function stop() {
    void api.databases.disconnect().then(setState);
  }, []);

  const copyPassword = useCallback(
    function copy() {
      return api.databases.copyPasswordToClipboard(database, environment);
    },
    [database, environment]
  );

  return {
    catalog,
    database,
    environment,
    connectionInfo: activeConnectionInfo,
    state,
    errors,
    selectDatabase,
    selectEnvironment,
    connect,
    disconnect,
    copyPassword,
  };
}
