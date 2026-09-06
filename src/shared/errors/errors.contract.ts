import { type Diagnosis } from "@/shared/errors/errors.types";

/** What the renderer may ask about a subgraph's failure. */
export type ErrorsContract = {
  diagnose(subgraph: string): Diagnosis[];
};
