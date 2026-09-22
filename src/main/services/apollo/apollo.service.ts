import {
  APOLLO_CLIENT_NAME,
  APOLLO_CLIENT_VERSION,
  APOLLO_PLATFORM_API_URL,
  FAILURES,
  JSON_FORMAT,
  PLATFORM_API_TIMEOUT_MS,
  VARIANTS_QUERY,
} from "@/main/services/apollo/apollo.constants";
import {
  type ParsedListing,
  type PlatformVariantsResponse,
  type RoverResponse,
  type RoverSubgraph,
} from "@/main/services/apollo/apollo.types";
import { environment } from "@/main/services/environment/environment.service";
import {
  addSupergraphError,
  clearSupergraphError,
} from "@/main/services/errors/errors.service";
import { runRover } from "@/main/services/rover/rover.service";
import { settings } from "@/main/services/settings/settings.service";
import { type ApolloContract } from "@/shared/apollo/apollo.contract";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import { type Awaitable } from "@/shared/contract/contract.types";
import { ErrorKey } from "@/shared/errors/errors.types";

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
      raw: "APOLLO_GRAPH_REF is not set, or no variant is selected.",
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

/**
 * Reads every variant before anything asks for one. Only the explicitly
 * configured filter is precached — with no filter, the dropdown falls back
 * to every variant the graph has (see `allVariants`), and that list is
 * typically far too large to precache a `rover subgraph list` for each one.
 */
export function cacheAllVariants(): void {
  const variants = settings.variantFilter();
  startupCheck = Promise.all(variants.map(checkVariant)).then(
    function summarize(checks) {
      checks.forEach(function store(check, index) {
        cache.set(variants[index], check.subgraphs);
      });

      const failure = checks.find(function isFailed(check) {
        return check.failed;
      });

      if (failure === undefined) {
        clearSupergraphError();
      } else {
        addSupergraphError(failure.keys, failure.raw);
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
    addSupergraphError(check.keys, check.raw);
  } else {
    clearSupergraphError();
  }

  return check.subgraphs;
}

/** Every variant the graph has in Apollo Studio, regardless of any local filter. */
async function fetchAllVariants(): Promise<string[]> {
  const graphName = environment.graphName();
  if (graphName === "") {
    return [];
  }

  try {
    const response = await fetch(APOLLO_PLATFORM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": environment.apolloKey(),
        "apollographql-client-name": APOLLO_CLIENT_NAME,
        "apollographql-client-version": APOLLO_CLIENT_VERSION,
      },
      body: JSON.stringify({
        query: VARIANTS_QUERY,
        variables: { graphId: graphName },
      }),
      signal: AbortSignal.timeout(PLATFORM_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as PlatformVariantsResponse;
    if (body.errors !== undefined || !body.data?.graph) {
      return [];
    }

    return body.data.graph.variants.map(function toName(variant) {
      return variant.name;
    });
  } catch {
    return [];
  }
}

export const apollo: Awaitable<ApolloContract> = {
  allVariants: fetchAllVariants,

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
