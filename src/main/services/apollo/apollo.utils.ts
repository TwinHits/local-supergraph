import { FAILURES } from "@/main/services/apollo/apollo.constants";
import {
  type RoverResponse,
  type RoverSubgraph,
} from "@/main/services/apollo/apollo.types";
import {
  ApolloFailure,
  type RegisteredSubgraph,
  type SubgraphListing,
} from "@/shared/apollo/apollo.types";

function empty(failure: ApolloFailure, message: string): SubgraphListing {
  return { subgraphs: [], failure, message };
}

function toSubgraph(subgraph: RoverSubgraph): RegisteredSubgraph {
  return { name: subgraph.name, routingUrl: subgraph.url };
}

/** Turns rover's JSON into a listing, or into the reason there is none. */
export function parseSubgraphList(stdout: string): SubgraphListing {
  let response: RoverResponse;
  try {
    response = JSON.parse(stdout) as RoverResponse;
  } catch {
    return empty(ApolloFailure.Unknown, "Rover did not answer with JSON.");
  }

  if (response.error !== undefined && response.error !== null) {
    const code = response.error.code ?? "";
    const message = response.error.message ?? "";
    return empty(FAILURES[code] ?? ApolloFailure.Unknown, message);
  }

  const subgraphs = response.data?.subgraphs ?? [];
  return {
    subgraphs: subgraphs.map(toSubgraph),
    failure: ApolloFailure.None,
    message: "",
  };
}
