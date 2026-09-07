import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import {
  portMessage,
  subgraphRows,
  tableView,
} from "@/renderer/features/SupergraphWorkspace/supergraphWorkspace.utils";
import {
  ApolloFailure,
  type SubgraphListing,
} from "@/shared/apollo/apollo.types";
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
  error: string;
};

const EMPTY: Snapshot = {
  subgraphs: [],
  overrides: {},
  health: {},
  error: "",
};

/** Builds the table's snapshot from what main answered. */
function toSnapshot(
  listing: SubgraphListing,
  overrides: OverrideMap,
  health: HealthMap
): Snapshot {
  return {
    subgraphs: listing.subgraphs,
    overrides,
    health,
    error:
      listing.failure === ApolloFailure.None
        ? ""
        : `Could not read the graph. ${listing.message}`,
  };
}

/** True when a reload brought back the same subgraphs and the same error. */
function sameListing(current: Snapshot, next: Snapshot): boolean {
  return (
    current.error === next.error &&
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortColumn>(SortColumn.Status);

  const load = useCallback(function read() {
    void Promise.all([
      api.apollo.listSubgraphs(),
      api.subgraph.overrides(),
      api.subgraph.health(),
    ]).then(function store([listing, overrides, health]) {
      setSnapshot(toSnapshot(listing, overrides, health));
      setLoading(false);
    });

    // The cached answer is on screen already; only replace it when the registry
    // has moved since it was cached.
    void api.apollo.reloadSubgraphs().then(function reloaded(listing) {
      setSnapshot(function keepUnlessChanged(current) {
        const next = toSnapshot(listing, current.overrides, current.health);
        return sameListing(current, next) ? current : next;
      });
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
    error: snapshot.error,
    loading,
    search,
    sort,
    setSearch,
    setSort,
    setOverride,
    reload: load,
  };
}
