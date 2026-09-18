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

/** One matched signature with everything the screen shows for it. */
export type Diagnosis = {
  key: ErrorKey;
  summary: string;
  cause: string;
  resolution: string[];
  raw: string | null;
  /** Which database this is about, for a database connection failure. Null for every other kind. */
  database: string | null;
};
