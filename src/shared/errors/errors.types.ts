export enum ErrorKey {
  RoverMissing = "ROVER_MISSING",
  GraphRefUnset = "GRAPH_REF_UNSET",
  ApolloKeyInvalid = "APOLLO_KEY_INVALID",
  GraphNotFound = "GRAPH_NOT_FOUND",
  AwsCliMissing = "AWS_CLI_MISSING",
  SessionManagerPluginMissing = "SESSION_MANAGER_PLUGIN_MISSING",
  AwsProfileMissing = "AWS_PROFILE_MISSING",
  DatabaseEntryMissing = "DATABASE_ENTRY_MISSING",
  AwsSsoExpired = "AWS_SSO_EXPIRED",
  PortInUse = "PORT_IN_USE",
  PortInvalid = "PORT_INVALID",
  CompositionFailed = "COMPOSITION_FAILED",
  ComposedButUnreachable = "COMPOSED_BUT_UNREACHABLE",
  SubgraphUnauthorized = "SUBGRAPH_UNAUTHORIZED",
  LocalRefused = "LOCAL_REFUSED",
  RemoteUnreachable = "REMOTE_UNREACHABLE",
  Unknown = "UNKNOWN",
}

/** Every subgraph that is failing and why. */
export type SubgraphErrorMap = Record<string, Diagnosis[]>;

/**
 * Whether an error is about the developer's local AWS setup — worth a
 * dedicated, table-wide callout, since one fix (e.g. signing back in)
 * commonly clears more than one row — or about one specific row's own
 * config or connection attempt, worth showing only on that row.
 */
export enum ErrorScope {
  Shared = "shared",
  RowSpecific = "row-specific",
}

/** One matched signature with everything the screen shows for it. */
export type Diagnosis = {
  key: ErrorKey;
  summary: string;
  cause: string;
  resolution: string[];
  raw: string | null;
  /** Which database this is about, for a database connection failure. Null for every other kind. */
  database: string | null;
  /** Which environment the database attempt was made under. Null for every other kind. */
  environment: string | null;
};
