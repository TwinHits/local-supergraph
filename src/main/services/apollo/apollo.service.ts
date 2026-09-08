import { JSON_FORMAT } from "@/main/services/apollo/apollo.constants";
import { parseSubgraphList } from "@/main/services/apollo/apollo.utils";
import { EnvironmentVariable } from "@/main/services/environment/environment.constants";
import { environment } from "@/main/services/environment/environment.service";
import {
  clearSupergraphFailure,
  reportSupergraphFailure,
} from "@/main/services/errors/errors.service";
import { runRover } from "@/main/services/rover/rover.service";
import { settings } from "@/main/services/settings/settings.service";
import { type ApolloContract } from "@/shared/apollo/apollo.contract";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import { type Awaitable } from "@/shared/contract/contract.types";
import { ErrorKey } from "@/shared/errors/errors.types";

const cache = new Map<string, RegisteredSubgraph[]>();

/** Asks the registry which subgraphs a variant has. */
async function readSubgraphsForVariant(
  variant: string
): Promise<RegisteredSubgraph[]> {
  const graphName = environment.graphName();
  if (graphName === "" || variant === "") {
    reportSupergraphFailure(
      [ErrorKey.GraphRefUnset],
      `${EnvironmentVariable.ApolloGraphRef} or ${EnvironmentVariable.SupergraphVariants} is not set.`
    );
    return [];
  }

  const result = await runRover([
    "subgraph",
    "list",
    `${graphName}@${variant}`,
    ...JSON_FORMAT,
  ]);

  if (!result.found) {
    reportSupergraphFailure([ErrorKey.RoverMissing], "rover is not installed.");
    return [];
  }

  const listing = parseSubgraphList(result.stdout);
  if (listing.failed) {
    reportSupergraphFailure(listing.keys, listing.raw);
    return [];
  }

  clearSupergraphFailure();
  return listing.subgraphs;
}

/** Reads every variant before anything asks for one. */
export function cacheAllVariants(): void {
  for (const variant of environment.variants()) {
    void readSubgraphsForVariant(variant).then(function store(subgraphs) {
      cache.set(variant, subgraphs);
    });
  }
}

/** Reads a variant from the registry and caches what came back. */
async function refreshSubgraphs(
  variant: string
): Promise<RegisteredSubgraph[]> {
  const subgraphs = await readSubgraphsForVariant(variant);
  cache.set(variant, subgraphs);
  return subgraphs;
}

export const apollo: Awaitable<ApolloContract> = {
  async listSubgraphs(): Promise<RegisteredSubgraph[]> {
    const variant = settings.currentVariant();
    const cached = cache.get(variant);

    if (cached !== undefined) {
      return cached;
    }

    return refreshSubgraphs(variant);
  },

  async reloadSubgraphs(): Promise<RegisteredSubgraph[]> {
    return refreshSubgraphs(settings.currentVariant());
  },
};
