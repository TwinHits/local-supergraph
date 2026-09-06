import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import {
  portMessage,
  subgraphRows,
  tableView,
} from "@/renderer/features/SupergraphWorkspace/supergraphWorkspace.utils";
import {
  Composition,
  type HealthMap,
  type OverrideMap,
  type Row,
  SortColumn,
  type Subgraph,
} from "@/shared/subgraph/subgraph.types";

const NO_COMPOSITION: Record<string, Composition> = {};

type Snapshot = {
  subgraphs: Subgraph[];
  overrides: OverrideMap;
  health: HealthMap;
};

const EMPTY: Snapshot = { subgraphs: [], overrides: {}, health: {} };

/** Collects the ports every local row is asking for. */
function claimedPorts(rows: Row[]): number[] {
  return rows
    .filter(function isLocal(row) {
      return row.local && row.port !== null;
    })
    .map(function toPort(row) {
      return row.port ?? 0;
    });
}

/** Builds the message under each local row's port input. */
function portErrors(rows: Row[], routerPort: number): Record<string, string> {
  const ports = claimedPorts(rows);
  const errors: Record<string, string> = {};
  for (const row of rows) {
    if (!row.local) {
      continue;
    }
    const others = [...ports];
    others.splice(others.indexOf(row.port ?? 0), 1);
    errors[row.name] = portMessage(row.port, others, routerPort);
  }
  return errors;
}

/** Holds the table's state and talks to main. Components take the result. */
export function useSubgraphs(routerPort: number) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortColumn>(SortColumn.Status);

  const load = useCallback(function read() {
    void Promise.all([
      api.subgraph.list(),
      api.subgraph.overrides(),
      api.subgraph.health(),
    ]).then(function store([subgraphs, overrides, health]) {
      setSnapshot({ subgraphs, overrides, health });
    });
  }, []);

  useEffect(load, [load]);

  const setOverride = useCallback(function write(
    name: string,
    local: boolean,
    port: number | null
  ) {
    void api.subgraph
      .setOverride(name, { local, port })
      .then(function store(overrides) {
        setSnapshot(function merge(current) {
          return { ...current, overrides };
        });
      });
  }, []);

  const all = subgraphRows({ ...snapshot, composition: NO_COMPOSITION });

  return {
    rows: tableView(all, search, sort),
    portErrors: portErrors(all, routerPort),
    search,
    sort,
    setSearch,
    setSort,
    setOverride,
    reload: load,
  };
}
