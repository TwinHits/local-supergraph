import { apollo } from "@/main/services/apollo/apollo.service";
import {
  clearSubgraphFailure,
  reportSubgraphFailure,
} from "@/main/services/errors/errors.service";
import {
  currentOverrides,
  settings,
} from "@/main/services/settings/settings.service";
import { PROBE_TIMEOUT_MS } from "@/main/services/subgraph-health/subgraph-health.constants";
import {
  type ProbeResult,
  type Target,
} from "@/main/services/subgraph-health/subgraph-health.types";
import {
  looksLikeGraphQL,
  toFailureText,
} from "@/main/services/subgraph-health/subgraph-health.utils";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import { ErrorKey } from "@/shared/errors/errors.types";
import {
  type HealthMap,
  type OverrideMap,
  Reachability,
} from "@/shared/subgraph/subgraph.types";

/**
 * Reports whether a URL answers as a working GraphQL endpoint. A plain
 * `fetch` would count a VPN login page or a 404 as "reachable" — this sends
 * an actual query, the same way rover's own introspection does, so a
 * subgraph that would fail composition shows red before Start is ever
 * clicked, not after rover has already tried and given up.
 */
async function checkEndpoint(url: string): Promise<ProbeResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (response.status === 401 || response.status === 403) {
      return {
        reachable: false,
        raw: `HTTP ${response.status}`,
        key: ErrorKey.SubgraphUnauthorized,
      };
    }
    if (!response.ok) {
      return { reachable: false, raw: `HTTP ${response.status}` };
    }
    const body: unknown = await response.json();
    if (!looksLikeGraphQL(body)) {
      return { reachable: false, raw: "Did not answer like a GraphQL server" };
    }
    return { reachable: true, raw: null };
  } catch (failure) {
    return { reachable: false, raw: toFailureText(failure) };
  }
}

/** Where a subgraph answers from and which failure to report when it does not. */
function buildTarget(
  subgraph: RegisteredSubgraph,
  overrides: OverrideMap
): Target | null {
  const override = overrides[subgraph.name];
  if (override !== undefined && override.local) {
    if (override.port === null) {
      return null;
    }
    return {
      name: subgraph.name,
      url: `http://${settings.localAddress(override.port)}`,
      key: ErrorKey.LocalRefused,
    };
  }
  return {
    name: subgraph.name,
    url: subgraph.routingUrl,
    key: ErrorKey.RemoteUnreachable,
  };
}

function isTarget(target: Target | null): target is Target {
  return target !== null;
}

/**
 * Probes one target and records what came back, retrying once on failure.
 * Electron's network service is still warming up (DNS, proxy/VPN routing)
 * for the app's very first fetch, so that attempt alone can time out even
 * though the target is reachable.
 * https://issues.chromium.org/issues/40958286
 */
async function checkTarget(target: Target): Promise<Reachability> {
  let result = await checkEndpoint(target.url);
  if (!result.reachable) {
    result = await checkEndpoint(target.url);
  }
  if (result.reachable) {
    clearSubgraphFailure(target.name);
    return Reachability.Reachable;
  }
  reportSubgraphFailure(target.name, [result.key ?? target.key], result.raw);
  return Reachability.Unreachable;
}

/**
 * Probes every subgraph at once, disabled ones included — a subgraph is
 * usually disabled because it's broken, and its row should keep showing
 * whether that's still true rather than freezing on whatever was last known.
 * Composition is what actually leaves disabled subgraphs out; this is just
 * telling the user about them.
 */
export async function checkSubgraphs(
  subgraphs: RegisteredSubgraph[],
  overrides: OverrideMap
): Promise<HealthMap> {
  const health: HealthMap = {};
  const targets: Target[] = [];

  for (const subgraph of subgraphs) {
    health[subgraph.name] = Reachability.Unknown;
    const target = buildTarget(subgraph, overrides);
    if (isTarget(target)) {
      targets.push(target);
    }
  }

  const found = await Promise.all(targets.map(checkTarget));
  for (let index = 0; index < targets.length; index += 1) {
    health[targets[index].name] = found[index];
  }

  return health;
}

export const subgraphHealth = {
  async checkHealth(): Promise<HealthMap> {
    return checkSubgraphs(await apollo.listSubgraphs(), currentOverrides());
  },
};
