import { PRIORITY, SIGNATURES } from "@/main/services/errors/errors.constants";
import { type ErrorsContract } from "@/shared/errors/errors.contract";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

/** Puts a subgraph's matches in priority order, highest first. */
function inPriorityOrder(keys: ErrorKey[]): ErrorKey[] {
  return PRIORITY.filter(function matched(key) {
    return keys.includes(key);
  });
}

/** Builds the diagnoses for a set of matched keys and the text they came from. */
export function diagnosesFor(keys: ErrorKey[], raw: string): Diagnosis[] {
  return inPriorityOrder(keys).map(function toDiagnosis(key) {
    return { ...SIGNATURES[key], raw };
  });
}

export const errors: ErrorsContract = {
  diagnose(): Diagnosis[] {
    return [];
  },
};
