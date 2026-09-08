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

type VariantCheck = {
  subgraphs: RegisteredSubgraph[];
  failed: boolean;
  keys: ErrorKey[];
  raw: string | null;
};

const cache = new Map<string, RegisteredSubgraph[]>();
let startupCheck: Promise<void> | null = null;

/** Asks the registry which subgraphs a variant has, without reporting the result. */
async function checkVariant(variant: string): Promise<VariantCheck> {
  const graphName = environment.graphName();
  if (graphName === "" || variant === "") {
    return {
      subgraphs: [],
      failed: true,
      keys: [ErrorKey.GraphRefUnset],
      raw: `${EnvironmentVariable.ApolloGraphRef} or ${EnvironmentVariable.SupergraphVariants} is not set.`,
    };
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
      failed: true,
      keys: [ErrorKey.RoverMissing],
      raw: "rover is not installed.",
    };
  }

  const listing = parseSubgraphList(result.stdout);
  if (listing.failed) {
    return {
      subgraphs: [],
      failed: true,
      keys: listing.keys,
      raw: listing.raw,
    };
  }

  return { subgraphs: listing.subgraphs, failed: false, keys: [], raw: null };
}

/** Reads every variant before anything asks for one. */
export function cacheAllVariants(): void {
  const variants = environment.variants();
  startupCheck = Promise.all(variants.map(checkVariant)).then(
    function summarize(checks) {
      checks.forEach(function store(check, index) {
        cache.set(variants[index], check.subgraphs);
      });

      const failure = checks.find(function isFailed(check) {
        return check.failed;
      });

      if (failure === undefined) {
        clearSupergraphFailure();
      } else {
        reportSupergraphFailure(failure.keys, failure.raw);
      }
    }
  );
}

/** Reads a variant from the registry and caches what came back. */
async function refreshSubgraphs(
  variant: string
): Promise<RegisteredSubgraph[]> {
  const check = await checkVariant(variant);
  cache.set(variant, check.subgraphs);

  if (check.failed) {
    reportSupergraphFailure(check.keys, check.raw);
  } else {
    clearSupergraphFailure();
  }

  return check.subgraphs;
}

export const apollo: Awaitable<ApolloContract> = {
  async listSubgraphs(): Promise<RegisteredSubgraph[]> {
    if (startupCheck !== null) {
      await startupCheck;
    }

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
