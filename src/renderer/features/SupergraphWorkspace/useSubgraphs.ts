import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/renderer/api";
import {
  applyPortDiagnoses,
  buildSubgraphRows,
  buildTableView,
} from "@/renderer/features/SupergraphWorkspace/supergraphWorkspace.utils";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import {
  type Diagnosis,
  type SubgraphErrorMap,
} from "@/shared/errors/errors.types";
import {
  Composition,
  type DisabledSubgraphs,
  type HealthMap,
  type OverrideMap,
  Reachability,
  SortColumn,
} from "@/shared/subgraph/subgraph.types";

const NO_COMPOSITION: Record<string, Composition> = {};
const SUPERGRAPH_ERROR_POLL_MS = 2000;
const SUBGRAPH_HEALTH_POLL_MS = 3000;

type Snapshot = {
  subgraphs: RegisteredSubgraph[];
  overrides: OverrideMap;
  health: HealthMap;
  errors: SubgraphErrorMap;
  supergraphErrors: Diagnosis[];
  disabled: DisabledSubgraphs;
};

const EMPTY: Snapshot = {
  subgraphs: [],
  overrides: {},
  health: {},
  errors: {},
  supergraphErrors: [],
  disabled: [],
};

/** True when two runs of failures say the same thing. */
function areFailuresEqual(current: Diagnosis[], next: Diagnosis[]): boolean {
  return (
    current.length === next.length &&
    current.every(function matches(diagnosis, index) {
      return diagnosis.key === next[index].key;
    })
  );
}

/** True when a reload brought back the same subgraphs and the same failures. */
function isSameListing(current: Snapshot, next: Snapshot): boolean {
  return (
    areFailuresEqual(current.supergraphErrors, next.supergraphErrors) &&
    current.subgraphs.length === next.subgraphs.length &&
    current.subgraphs.every(function matches(subgraph, index) {
      const other = next.subgraphs[index];
      return (
        subgraph.name === other.name && subgraph.routingUrl === other.routingUrl
      );
    })
  );
}

/** Holds the table's state and talks to main. */
export function useSubgraphs(
  routerPort: number,
  supergraphActive: boolean,
  variant: string
) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortColumn>(SortColumn.Name);
  const [loadedVariant, setLoadedVariant] = useState(variant);

  if (variant !== loadedVariant) {
    setLoadedVariant(variant);
    setSearch("");
    setSort(SortColumn.Name);
    setLoading(true);
  }

  const load = useCallback(function read() {
    const primary = Promise.all([
      api.apollo.listSubgraphs(),
      api.subgraph.overrides(),
      api.subgraph.checkHealth(),
      api.subgraph.disabledSubgraphs(),
    ]).then(function store([subgraphs, overrides, health, disabled]) {
      return Promise.all([
        api.errors.subgraphErrors(),
        api.errors.supergraphErrors(),
      ]).then(function withErrors([errors, supergraph]) {
        setSnapshot({
          subgraphs,
          overrides,
          health,
          errors,
          supergraphErrors: supergraph,
          disabled,
        });
        setLoading(false);
      });
    });

    const secondary = api.apollo
      .reloadSubgraphs()
      .then(function reloaded(subgraphs) {
        return api.errors
          .supergraphErrors()
          .then(function withSupergraph(supergraph) {
            setSnapshot(function keepUnlessChanged(current) {
              const next = {
                ...current,
                subgraphs,
                supergraphErrors: supergraph,
              };
              return isSameListing(current, next) ? current : next;
            });
          });
      });

    void Promise.all([primary, secondary]).then(function finish() {
      setRefreshing(false);
    });
  }, []);

  useEffect(
    function reloadForVariant() {
      load();
    },
    [variant, load]
  );

  const refresh = useCallback(
    function trigger() {
      setRefreshing(true);
      load();
    },
    [load]
  );

  useEffect(
    function pollSupergraphErrorsWhileActive() {
      if (!supergraphActive) {
        return undefined;
      }

      const interval = setInterval(function check() {
        void api.errors
          .supergraphErrors()
          .then(function apply(supergraphErrors) {
            setSnapshot(function merge(current) {
              return areFailuresEqual(
                current.supergraphErrors,
                supergraphErrors
              )
                ? current
                : { ...current, supergraphErrors };
            });
          });
      }, SUPERGRAPH_ERROR_POLL_MS);

      return function stop() {
        clearInterval(interval);
      };
    },
    [supergraphActive]
  );

  const overrideGeneration = useRef(0);

  const refreshHealth = useCallback(function refresh() {
    const generation = overrideGeneration.current;
    void api.subgraph.checkHealth().then(function withHealth(health) {
      return api.errors.subgraphErrors().then(function withErrors(errors) {
        if (generation === overrideGeneration.current) {
          setSnapshot(function merge(current) {
            return { ...current, health, errors };
          });
        }
      });
    });
  }, []);

  useEffect(
    function pollSubgraphHealth() {
      const interval = setInterval(function check() {
        refreshHealth();
      }, SUBGRAPH_HEALTH_POLL_MS);

      return function stop() {
        clearInterval(interval);
      };
    },
    [refreshHealth]
  );

  const updateOverride = useCallback(
    function write(name: string, local: boolean, port: number | null) {
      overrideGeneration.current += 1;
      setSnapshot(function resetHealth(current) {
        return {
          ...current,
          health: { ...current.health, [name]: Reachability.Unknown },
        };
      });

      void api.subgraph
        .updateOverride(name, { local, port })
        .then(function store(overrides) {
          setSnapshot(function merge(current) {
            return { ...current, overrides };
          });
          refreshHealth();
        });
    },
    [refreshHealth]
  );

  const updateEnabled = useCallback(function write(
    name: string,
    enabled: boolean
  ) {
    void api.subgraph
      .setSubgraphEnabled(name, enabled)
      .then(function store(disabled) {
        setSnapshot(function merge(current) {
          return { ...current, disabled };
        });
      });
  }, []);

  const all = buildSubgraphRows({ ...snapshot, composition: NO_COMPOSITION });
  const validated = applyPortDiagnoses(all, snapshot.errors, routerPort);

  return {
    rows: buildTableView(validated.rows, search, sort),
    errors: validated.errors,
    supergraphErrors: snapshot.supergraphErrors,
    loading,
    refreshing,
    search,
    sort,
    setSearch,
    setSort,
    updateOverride,
    updateEnabled,
    reload: refresh,
  };
}
