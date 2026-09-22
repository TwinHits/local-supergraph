import {
  type Diagnosis,
  type SubgraphErrorMap,
} from "@/shared/errors/errors.types";

/** What the renderer may ask about a failure. */
export type ErrorsContract = {
  subgraphErrors(): SubgraphErrorMap;
  supergraphErrors(): Diagnosis[];
  databaseConnectionErrors(): Diagnosis[];
};
