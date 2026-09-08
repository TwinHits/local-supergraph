import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import {
  type Diagnosis,
  type SubgraphErrorMap,
} from "@/shared/errors/errors.types";
import {
  Composition,
  type HealthMap,
  type OverrideMap,
  Reachability,
  type Row,
  RowStatus,
  SortColumn,
} from "@/shared/subgraph/subgraph.types";

/** Writes one failure as a single line. */
export function buildDiagnosisMessage(diagnosis: Diagnosis): string {
  return `${diagnosis.summary}: ${diagnosis.cause}`;
}

/** Names which subgraph and variant an error modal is showing. */
export function buildErrorSubject(name: string, variant: string): string {
  return `${name} — ${variant}`;
}

type Signals = {
  local: boolean;
  reachability: Reachability;
  composition: Composition;
};

/** Turns a reported reachability into a row status. */
function toReachabilityStatus(reachability: Reachability): RowStatus {
  if (reachability === Reachability.Reachable) {
    return RowStatus.Healthy;
  }
  if (reachability === Reachability.Unreachable) {
    return RowStatus.Failed;
  }
  return RowStatus.Pending;
}

/** Turns a reported composition into a row status. */
function toCompositionStatus(composition: Composition): RowStatus {
  if (composition === Composition.Composed) {
    return RowStatus.Healthy;
  }
  if (composition === Composition.Failed) {
    return RowStatus.Failed;
  }
  return RowStatus.Pending;
}

/** Picks the signal closest to the developer's own machine. */
export function buildRowStatus(signals: Signals): RowStatus {
  if (signals.local) {
    const local = toReachabilityStatus(signals.reachability);
    if (local !== RowStatus.Pending) {
      return local;
    }
  }

  const composed = toCompositionStatus(signals.composition);
  if (composed !== RowStatus.Pending) {
    return composed;
  }

  return toReachabilityStatus(signals.reachability);
}

type Sources = {
  subgraphs: RegisteredSubgraph[];
  overrides: OverrideMap;
  health: HealthMap;
  composition: Record<string, Composition>;
  errors: SubgraphErrorMap;
};

const REASONS: Record<RowStatus, string> = {
  [RowStatus.Healthy]: "Answering",
  [RowStatus.Failed]: "Not answering",
  [RowStatus.Pending]: "No answer yet",
};

/** The row's top failure, or the result of its probe when there is none. */
function buildRowReason(status: RowStatus, diagnoses: Diagnosis[]): string {
  const top = diagnoses[0];
  if (top === undefined) {
    return REASONS[status];
  }
  return top.summary;
}

/** Merges the sources into one line per subgraph. */
export function buildSubgraphRows(sources: Sources): Row[] {
  return sources.subgraphs.map(function toRow(subgraph) {
    const override = sources.overrides[subgraph.name];
    const local = override !== undefined && override.local;
    const status = buildRowStatus({
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
      reason: buildRowReason(status, sources.errors[subgraph.name] ?? []),
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

/** Compares two rows on one column, breaking ties by name. */
function compareRows(left: Row, right: Row, column: SortColumn): number {
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

/** Sorts a copy of the rows, failed ones first. */
export function sortRows(rows: Row[], column: SortColumn): Row[] {
  return [...rows].sort(function byColumn(left, right) {
    return compareRows(left, right, column);
  });
}

/** Filters the rows and then sorts them. */
export function buildTableView(
  rows: Row[],
  search: string,
  column: SortColumn
): Row[] {
  return sortRows(filterRows(rows, search), column);
}

const LOWEST_PORT = 1;
const HIGHEST_PORT = 65535;

/** True when a number is a port a service could bind. */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= LOWEST_PORT && port <= HIGHEST_PORT;
}

/**
 * The message under a port input, or an empty string when the port is usable.
 */
export function buildPortMessage(
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
