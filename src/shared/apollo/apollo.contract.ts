import { type SubgraphListing } from "@/shared/apollo/apollo.types";

/** What the renderer may ask about the graph in the registry. */
export type ApolloContract = {
  listSubgraphs(): SubgraphListing;
  reloadSubgraphs(): SubgraphListing;
};
