import { join } from "node:path";

/** The file the app reads its configuration from. */
export const ENV_FILE = join(process.cwd(), ".env");

/** Used when AWS_REGION isn't set, since the script this replaces hardcoded it throughout. */
export const DEFAULT_AWS_REGION = "us-east-1";

export enum EnvironmentVariable {
  ApolloGraphRef = "APOLLO_GRAPH_REF",
  ApolloKey = "APOLLO_KEY",
  ApolloElv2License = "APOLLO_ELV2_LICENSE",
  ApolloRoverSkipUpdate = "APOLLO_ROVER_SKIP_UPDATE",
  ApolloTelemetryDisabled = "APOLLO_TELEMETRY_DISABLED",
  AwsRegion = "AWS_REGION",
}
