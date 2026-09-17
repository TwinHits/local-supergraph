import {
  buildDiagnoses,
  findMatchingKeys,
} from "@/main/services/errors/errors.utils";
import { type ErrorsContract } from "@/shared/errors/errors.contract";
import {
  type Diagnosis,
  ErrorKey,
  type SubgraphErrorMap,
} from "@/shared/errors/errors.types";

type Report = {
  keys: ErrorKey[];
  raw: string | null;
};

const subgraphReports = new Map<string, Report>();
const databaseConnectionReports = new Map<string, Report>();
let supergraphReport: Report | null = null;

/** The keys the caller named plus any found in the text. */
function buildReport(keys: ErrorKey[], raw: string | null): Report {
  const found = [...new Set([...keys, ...findMatchingKeys(raw)])];
  return { keys: found.length === 0 ? [ErrorKey.Unknown] : found, raw };
}

/** Turns a report into its diagnoses. */
function toDiagnoses(report: Report | null): Diagnosis[] {
  if (report === null) {
    return [];
  }
  return buildDiagnoses(report.keys, report.raw);
}

/** Records what went wrong with the supergraph. */
export function reportSupergraphFailure(
  keys: ErrorKey[],
  raw: string | null
): void {
  supergraphReport = buildReport(keys, raw);
}

/** Forgets the supergraph's last failure. */
export function clearSupergraphFailure(): void {
  supergraphReport = null;
}

/** Records what went wrong with one subgraph. */
export function reportSubgraphFailure(
  name: string,
  keys: ErrorKey[],
  raw: string | null
): void {
  subgraphReports.set(name, buildReport(keys, raw));
}

/** Forgets one subgraph's last failure. */
export function clearSubgraphFailure(name: string): void {
  subgraphReports.delete(name);
}

/** Records what went wrong with one database's connection. */
export function reportDatabaseConnectionFailure(
  database: string,
  keys: ErrorKey[],
  raw: string | null
): void {
  databaseConnectionReports.set(database, buildReport(keys, raw));
}

/** Forgets one database connection's last failure. */
export function clearDatabaseConnectionFailure(database: string): void {
  databaseConnectionReports.delete(database);
}

export const errors: ErrorsContract = {
  subgraphErrors(): SubgraphErrorMap {
    const failing: SubgraphErrorMap = {};
    for (const [subgraph, report] of subgraphReports) {
      failing[subgraph] = toDiagnoses(report);
    }
    return failing;
  },
  supergraphErrors(): Diagnosis[] {
    return toDiagnoses(supergraphReport);
  },
  databaseConnectionErrors(): Diagnosis[] {
    return [...databaseConnectionReports.values()].flatMap(toDiagnoses);
  },
};
