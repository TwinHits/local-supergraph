/** One subgraph as the registry describes it. */
export type RegisteredSubgraph = {
  name: string;
  routingUrl: string;
};

export enum ApolloFailure {
  None = "none",
  InvalidKey = "invalid-key",
  UnknownGraph = "unknown-graph",
  Unreachable = "unreachable",
  Unknown = "unknown",
}

/** What the registry answered, or why it did not. */
export type SubgraphListing = {
  subgraphs: RegisteredSubgraph[];
  failure: ApolloFailure;
  message: string;
};
