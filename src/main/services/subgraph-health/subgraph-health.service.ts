import { apollo } from "@/main/services/apollo/apollo.service";
import {
  clearSubgraphFailure,
  reportSubgraphFailure,
} from "@/main/services/errors/errors.service";
import { settings } from "@/main/services/settings/settings.service";
import { PROBE_TIMEOUT_MS } from "@/main/services/subgraph-health/subgraph-health.constants";
import {
  type ProbeResult,
  type Target,
} from "@/main/services/subgraph-health/subgraph-health.types";
import { toFailureText } from "@/main/services/subgraph-health/subgraph-health.utils";
import { subgraphOverrides } from "@/main/services/subgraph-overrides/subgraph-overrides.service";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import { ErrorKey } from "@/shared/errors/errors.types";
import {
  type HealthMap,
  type OverrideMap,
  Reachability,
} from "@/shared/subgraph/subgraph.types";

/** Reports whether a URL answers at all. */
async function checkEndpoint(url: string): Promise<ProbeResult> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
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

/** Probes one target and records what came back. */
async function checkTarget(target: Target): Promise<Reachability> {
  const result = await checkEndpoint(target.url);
  if (result.reachable) {
    clearSubgraphFailure(target.name);
    return Reachability.Reachable;
  }
  reportSubgraphFailure(target.name, [target.key], result.raw);
  return Reachability.Unreachable;
}

/** Probes every subgraph at once. */
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
    return checkSubgraphs(
      await apollo.listSubgraphs(),
      subgraphOverrides.overrides()
    );
  },
};
