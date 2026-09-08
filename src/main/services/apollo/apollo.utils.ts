import { FAILURES } from "@/main/services/apollo/apollo.constants";
import {
  type ParsedListing,
  type RoverResponse,
  type RoverSubgraph,
} from "@/main/services/apollo/apollo.types";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import { type ErrorKey } from "@/shared/errors/errors.types";

function toFailure(keys: ErrorKey[], raw: string | null): ParsedListing {
  return { subgraphs: [], failed: true, keys, raw };
}

function toSubgraph(subgraph: RoverSubgraph): RegisteredSubgraph {
  return { name: subgraph.name, routingUrl: subgraph.url };
}

/** Parses rover's JSON into a listing. */
export function parseSubgraphList(stdout: string): ParsedListing {
  let response: RoverResponse;
  try {
    response = JSON.parse(stdout) as RoverResponse;
  } catch {
    return toFailure([], stdout);
  }

  if (response.error !== undefined && response.error !== null) {
    const key = FAILURES[response.error.code ?? ""];
    return toFailure(
      key === undefined ? [] : [key],
      response.error.message ?? null
    );
  }

  const subgraphs = response.data?.subgraphs ?? [];
  return {
    subgraphs: subgraphs.map(toSubgraph),
    failed: false,
    keys: [],
    raw: null,
  };
}
