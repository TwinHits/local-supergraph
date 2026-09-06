export enum ErrorKey {
  ApolloKeyInvalid = "APOLLO_KEY_INVALID",
  AwsSsoExpired = "AWS_SSO_EXPIRED",
  PortInUse = "PORT_IN_USE",
  CompositionFailed = "COMPOSITION_FAILED",
  ComposedButUnreachable = "COMPOSED_BUT_UNREACHABLE",
  LocalRefused = "LOCAL_REFUSED",
  RemoteUnreachable = "REMOTE_UNREACHABLE",
  Unknown = "UNKNOWN",
}

/** One matched signature, ready to show. All error copy comes from here. */
export type Diagnosis = {
  key: ErrorKey;
  summary: string;
  cause: string;
  resolution: string[];
  command: string | null;
  raw: string;
};
