import { type Diagnosis } from "@/shared/errors/errors.types";

/** Writes one failure as a single line. */
export function buildDiagnosisMessage(diagnosis: Diagnosis): string {
  return `${diagnosis.summary}: ${diagnosis.cause}`;
}
