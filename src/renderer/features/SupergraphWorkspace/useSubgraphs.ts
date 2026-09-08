import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import {
  buildPortMessage,
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
  type HealthMap,
  type OverrideMap,
  type Row,
  SortColumn,
} from "@/shared/subgraph/subgraph.types";

const NO_COMPOSITION: Record<string, Composition> = {};

type Snapshot = {
  subgraphs: RegisteredSubgraph[];
  overrides: OverrideMap;
  health: HealthMap;
  errors: SubgraphErrorMap;
  supergraphErrors: Diagnosis[];
};

const EMPTY: Snapshot = {
  subgraphs: [],
  overrides: {},
  health: {},
  errors: {},
  supergraphErrors: [],
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

/** Collects the ports every local row is asking for. */
function collectClaimedPorts(rows: Row[]): number[] {
  return rows
    .filter(function isLocal(row) {
      return row.local && row.port !== null;
    })
    .map(function toPort(row) {
      return row.port ?? 0;
    });
}

/** Builds the message under each local row's port input. */
function buildPortErrors(
  rows: Row[],
  routerPort: number
): Record<string, string> {
  const ports = collectClaimedPorts(rows);
  const errors: Record<string, string> = {};
  for (const row of rows) {
    if (!row.local) {
      continue;
    }
    const others = [...ports];
    others.splice(others.indexOf(row.port ?? 0), 1);
    errors[row.name] = buildPortMessage(row.port, others, routerPort);
  }
  return errors;
}

/** Holds the table's state and talks to main. */
export function useSubgraphs(routerPort: number) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortColumn>(SortColumn.Status);

  const load = useCallback(function read() {
    void Promise.all([
      api.apollo.listSubgraphs(),
      api.subgraph.overrides(),
      api.subgraph.checkHealth(),
    ]).then(function store([subgraphs, overrides, health]) {
      void Promise.all([
        api.errors.subgraphErrors(),
        api.errors.supergraphErrors(),
      ]).then(function withErrors([errors, supergraph]) {
        setSnapshot({
          subgraphs,
          overrides,
          health,
          errors,
          supergraphErrors: supergraph,
        });
        setLoading(false);
      });
    });

    // Only replace the cached answer when the registry has moved since.
    void api.apollo.reloadSubgraphs().then(function reloaded(subgraphs) {
      void api.errors
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
  }, []);

  useEffect(load, [load]);

  const updateOverride = useCallback(function write(
    name: string,
    local: boolean,
    port: number | null
  ) {
    void api.subgraph
      .updateOverride(name, { local, port })
      .then(function store(overrides) {
        setSnapshot(function merge(current) {
          return { ...current, overrides };
        });
      });
  }, []);

  const all = buildSubgraphRows({ ...snapshot, composition: NO_COMPOSITION });

  return {
    rows: buildTableView(all, search, sort),
    portErrors: buildPortErrors(all, routerPort),
    errors: snapshot.errors,
    supergraphErrors: snapshot.supergraphErrors,
    loading,
    search,
    sort,
    setSearch,
    setSort,
    updateOverride,
    reload: load,
  };
}
