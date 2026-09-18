import {
  PATTERNS,
  PRIORITY,
  SIGNATURES,
} from "@/main/services/errors/errors.constants";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

/** Sorts keys into priority order. */
function sortByPriority(keys: ErrorKey[]): ErrorKey[] {
  return PRIORITY.filter(function matched(key) {
    return keys.includes(key);
  });
}

/** Finds every signature whose wording appears in a failure. */
export function findMatchingKeys(raw: string | null): ErrorKey[] {
  if (raw === null) {
    return [];
  }
  return PRIORITY.filter(function appears(key) {
    return PATTERNS[key].some(function found(pattern) {
      return pattern.test(raw);
    });
  });
}

/** Builds a diagnosis for each key. `database` names which database this diagnosis is about, if any. */
export function buildDiagnoses(
  keys: ErrorKey[],
  raw: string | null,
  database: string | null = null
): Diagnosis[] {
  return sortByPriority(keys).map(function toDiagnosis(key) {
    return { ...SIGNATURES[key], raw, database };
  });
}
