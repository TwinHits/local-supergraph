import { type DatabaseRow } from "@/renderer/features/Databases/useDatabases";
import { ERROR_SCOPES } from "@/shared/errors/errors.constants";
import { type Diagnosis, ErrorScope } from "@/shared/errors/errors.types";

/** Sorts a copy of the rows alphabetically by name. */
export function sortDatabaseRowsByName(rows: DatabaseRow[]): DatabaseRow[] {
  return [...rows].sort(function byName(left, right) {
    return left.name.localeCompare(right.name);
  });
}

/** The errors worth a table-wide callout — a local AWS setup problem, not one row's own config. */
export function sharedDatabaseErrors(errors: Diagnosis[]): Diagnosis[] {
  return errors.filter(function isShared(diagnosis) {
    return ERROR_SCOPES[diagnosis.key] === ErrorScope.Shared;
  });
}

/** One database's own current errors, regardless of scope. */
export function errorsForDatabase(
  errors: Diagnosis[],
  name: string
): Diagnosis[] {
  return errors.filter(function isForDatabase(diagnosis) {
    return diagnosis.database === name;
  });
}

/** A row's top current error, as a short explanation — null when it has none. */
export function buildDatabaseRowReason(errors: Diagnosis[]): string | null {
  return errors[0]?.summary ?? null;
}
