import { join } from "node:path";

/** The file the app reads its configuration from. */
export const ENV_FILE = join(process.cwd(), ".env");

export enum EnvironmentVariable {
  ApolloGraphRef = "APOLLO_GRAPH_REF",
  ApolloKey = "APOLLO_KEY",
  SupergraphVariants = "SUPERGRAPH_VARIANTS",
  ApolloElv2License = "APOLLO_ELV2_LICENSE",
  ApolloRoverSkipUpdate = "APOLLO_ROVER_SKIP_UPDATE",
  ApolloTelemetryDisabled = "APOLLO_TELEMETRY_DISABLED",
}
