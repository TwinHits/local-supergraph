import { JSON_FORMAT } from "@/main/services/apollo/apollo.constants";
import { parseSubgraphList } from "@/main/services/apollo/apollo.utils";
import { EnvironmentVariable } from "@/main/services/environment/environment.constants";
import { environment } from "@/main/services/environment/environment.service";
import { runRover } from "@/main/services/rover/rover.service";
import { settings } from "@/main/services/settings/settings.service";
import { type ApolloContract } from "@/shared/apollo/apollo.contract";
import {
  ApolloFailure,
  type SubgraphListing,
} from "@/shared/apollo/apollo.types";
import { type Awaitable } from "@/shared/contract/contract.types";

const cache = new Map<string, SubgraphListing>();

function unset(message: string): SubgraphListing {
  return { subgraphs: [], failure: ApolloFailure.UnknownGraph, message };
}

/** Asks the registry for one variant. Every call costs a round trip. */
async function getSubgraphsForVariant(
  variant: string
): Promise<SubgraphListing> {
  const graphName = environment.graphName();
  if (graphName === "" || variant === "") {
    return unset(
      `${EnvironmentVariable.ApolloGraphRef} or ${EnvironmentVariable.SupergraphVariants} is not set.`
    );
  }

  const result = await runRover([
    "subgraph",
    "list",
    `${graphName}@${variant}`,
    ...JSON_FORMAT,
  ]);

  if (!result.found) {
    return {
      subgraphs: [],
      failure: ApolloFailure.Unreachable,
      message: "rover is not installed.",
    };
  }

  return parseSubgraphList(result.stdout);
}

/** Fills the cache for every offered variant, so switching is instant. */
export function prefetchVariants(): void {
  for (const variant of environment.variants()) {
    void getSubgraphsForVariant(variant).then(function store(listing) {
      cache.set(variant, listing);
    });
  }
}

/** Reads a variant from the registry and caches what came back. */
async function reread(variant: string): Promise<SubgraphListing> {
  const listing = await getSubgraphsForVariant(variant);
  cache.set(variant, listing);
  return listing;
}

export const apollo: Awaitable<ApolloContract> = {
  async listSubgraphs(): Promise<SubgraphListing> {
    const variant = settings.currentVariant();
    const cached = cache.get(variant);

    if (cached !== undefined) {
      return cached;
    }

    return reread(variant);
  },

  async reloadSubgraphs(): Promise<SubgraphListing> {
    return reread(settings.currentVariant());
  },
};
