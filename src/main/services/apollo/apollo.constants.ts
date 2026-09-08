import { ErrorKey } from "@/shared/errors/errors.types";

/** Rover's error code for a key the registry rejected. */
export const INVALID_KEY_CODE = "E004";

/** Rover's error code for a graph or variant the key cannot see. */
export const UNKNOWN_GRAPH_CODE = "E009";

export const JSON_FORMAT = ["--format", "json"];

export const FAILURES: Record<string, ErrorKey> = {
  [INVALID_KEY_CODE]: ErrorKey.ApolloKeyInvalid,
  [UNKNOWN_GRAPH_CODE]: ErrorKey.GraphNotFound,
};
