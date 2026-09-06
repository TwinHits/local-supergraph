import {
  Composition,
  Reachability,
  RowStatus,
  SortColumn,
  type HealthMap,
  type OverrideMap,
  type Row,
  type Subgraph,
} from "@/shared/subgraph/subgraph.types";

type Signals = {
  local: boolean;
  reachability: Reachability;
  composition: Composition;
};

/** Turns a reported reachability into a row status. */
function fromReachability(reachability: Reachability): RowStatus {
  if (reachability === Reachability.Reachable) {
    return RowStatus.Healthy;
  }
  if (reachability === Reachability.Unreachable) {
    return RowStatus.Failed;
  }
  return RowStatus.Pending;
}

/** Turns a reported composition into a row status. */
function fromComposition(composition: Composition): RowStatus {
  if (composition === Composition.Composed) {
    return RowStatus.Healthy;
  }
  if (composition === Composition.Failed) {
    return RowStatus.Failed;
  }
  return RowStatus.Pending;
}

/**
 * Shows whichever signal is closest to the developer's machine (§2.5): a local
 * port they own, then composition, then a remote URL they cannot fix.
 */
export function rowStatus(signals: Signals): RowStatus {
  if (signals.local) {
    const local = fromReachability(signals.reachability);
    if (local !== RowStatus.Pending) {
      return local;
    }
  }

  const composed = fromComposition(signals.composition);
  if (composed !== RowStatus.Pending) {
    return composed;
  }

  return fromReachability(signals.reachability);
}

type Sources = {
  subgraphs: Subgraph[];
  overrides: OverrideMap;
  health: HealthMap;
  composition: Record<string, Composition>;
};

const REASONS: Record<RowStatus, string> = {
  [RowStatus.Healthy]: "Answering",
  [RowStatus.Failed]: "Not answering",
  [RowStatus.Pending]: "No answer yet",
};

/** Merges the four sources into one line per subgraph (§2.7). */
export function subgraphRows(sources: Sources): Row[] {
  return sources.subgraphs.map(function toRow(subgraph) {
    const override = sources.overrides[subgraph.name];
    const local = override !== undefined && override.local;
    const status = rowStatus({
      local,
      reachability: sources.health[subgraph.name] ?? Reachability.Unknown,
      composition: sources.composition[subgraph.name] ?? Composition.NotRunning,
    });

    return {
      name: subgraph.name,
      routingUrl: subgraph.routingUrl,
      local,
      port: override === undefined ? null : override.port,
      status,
      reason: REASONS[status],
    };
  });
}

const STATUS_ORDER: Record<RowStatus, number> = {
  [RowStatus.Failed]: 0,
  [RowStatus.Pending]: 1,
  [RowStatus.Healthy]: 2,
};

/** Keeps the rows whose name or URL contains the search text. */
export function filterRows(rows: Row[], search: string): Row[] {
  const needle = search.trim().toLowerCase();
  if (needle === "") {
    return rows;
  }
  return rows.filter(function matches(row) {
    return (
      row.name.toLowerCase().includes(needle) ||
      row.routingUrl.toLowerCase().includes(needle)
    );
  });
}

/** Compares two rows on one column, broken tie by name. */
function compare(left: Row, right: Row, column: SortColumn): number {
  if (column === SortColumn.Status) {
    const gap = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    return gap === 0 ? left.name.localeCompare(right.name) : gap;
  }
  if (column === SortColumn.Local) {
    const gap = Number(right.local) - Number(left.local);
    return gap === 0 ? left.name.localeCompare(right.name) : gap;
  }
  return left.name.localeCompare(right.name);
}

/** Sorts a copy of the rows. Failed first, so the broken ones are on top. */
export function sortRows(rows: Row[], column: SortColumn): Row[] {
  return [...rows].sort(function byColumn(left, right) {
    return compare(left, right, column);
  });
}

/** The rows the table shows: filtered, then sorted. */
export function tableView(
  rows: Row[],
  search: string,
  column: SortColumn
): Row[] {
  return sortRows(filterRows(rows, search), column);
}

const LOWEST_PORT = 1;
const HIGHEST_PORT = 65535;

/** True when a number is a port a service could actually bind. */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= LOWEST_PORT && port <= HIGHEST_PORT;
}

/**
 * The message shown under a port input, or an empty string when the port is
 * usable. Collisions matter as much as range: two rows on one port compose,
 * then one of them answers for both.
 */
export function portMessage(
  port: number | null,
  takenPorts: number[],
  routerPort: number
): string {
  if (port === null) {
    return "Pick a port";
  }
  if (!isValidPort(port)) {
    return `Ports run ${LOWEST_PORT} to ${HIGHEST_PORT}`;
  }
  if (port === routerPort) {
    return "The router is on this port";
  }
  if (takenPorts.includes(port)) {
    return "Another subgraph is on this port";
  }
  return "";
}
