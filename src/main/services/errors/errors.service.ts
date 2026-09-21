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
/** database name -> environment name -> that pick's current failure. */
const databaseConnectionReports = new Map<string, Map<string, Report>>();
let supergraphReport: Report | null = null;

/** The keys the caller named plus any found in the text. */
function buildReport(keys: ErrorKey[], raw: string | null): Report {
  const found = [...new Set([...keys, ...findMatchingKeys(raw)])];
  return { keys: found.length === 0 ? [ErrorKey.Unknown] : found, raw };
}

/** Turns a report into its diagnoses. `database` names which database it's about, if any. */
function toDiagnoses(
  report: Report | null,
  database: string | null = null,
  environment: string | null = null
): Diagnosis[] {
  if (report === null) {
    return [];
  }
  return buildDiagnoses(report.keys, report.raw, database, environment);
}

/**
 * Records one subgraph's current failure, replacing whatever was recorded
 * for it before. `raw` is also scanned for a signature the caller didn't
 * name, falling back to ErrorKey.Unknown when nothing matches and `keys` is
 * otherwise empty.
 */
export function addSubgraphError(
  name: string,
  keys: ErrorKey[],
  raw: string | null
): void {
  subgraphReports.set(name, buildReport(keys, raw));
}

/** Forgets one subgraph's failure — it's healthy again. */
export function clearSubgraphError(name: string): void {
  subgraphReports.delete(name);
}

/** Records the supergraph's current failure. See addSubgraphError for how `raw` is read. */
export function addSupergraphError(keys: ErrorKey[], raw: string | null): void {
  supergraphReport = buildReport(keys, raw);
}

/** Forgets the supergraph's failure — it's healthy again. */
export function clearSupergraphError(): void {
  supergraphReport = null;
}

/**
 * Records one (database, environment) pick's current failure. See
 * addSubgraphError for how `raw` is read. Scoped by environment as well as
 * database so a failed attempt under one environment doesn't linger once the
 * developer has moved on to another.
 */
export function addDatabaseError(
  database: string,
  environment: string,
  keys: ErrorKey[],
  raw: string | null
): void {
  const byEnvironment = databaseConnectionReports.get(database) ?? new Map();
  byEnvironment.set(environment, buildReport(keys, raw));
  databaseConnectionReports.set(database, byEnvironment);
}

/** Forgets one (database, environment) pick's failure — it's healthy again. */
export function clearDatabaseError(
  database: string,
  environment: string
): void {
  databaseConnectionReports.get(database)?.delete(environment);
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
    return [...databaseConnectionReports.entries()].flatMap(
      function toDatabaseDiagnoses([database, byEnvironment]) {
        return [...byEnvironment.entries()].flatMap(function toEntryDiagnoses([
          environment,
          report,
        ]) {
          return toDiagnoses(report, database, environment);
        });
      }
    );
  },
};
