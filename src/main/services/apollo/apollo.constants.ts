import { ApolloFailure } from "@/shared/apollo/apollo.types";

/** Rover's error code for a key the registry rejected. */
export const INVALID_KEY_CODE = "E004";

/** Rover's error code for a graph or variant the key cannot see. */
export const UNKNOWN_GRAPH_CODE = "E009";

export const JSON_FORMAT = ["--format", "json"];

export const FAILURES: Record<string, ApolloFailure> = {
  [INVALID_KEY_CODE]: ApolloFailure.InvalidKey,
  [UNKNOWN_GRAPH_CODE]: ApolloFailure.UnknownGraph,
};
