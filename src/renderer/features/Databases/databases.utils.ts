import { type DatabaseRow } from "@/renderer/features/Databases/useDatabases";

/** Sorts a copy of the rows alphabetically by name. */
export function sortDatabaseRowsByName(rows: DatabaseRow[]): DatabaseRow[] {
  return [...rows].sort(function byName(left, right) {
    return left.name.localeCompare(right.name);
  });
}
