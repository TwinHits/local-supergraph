import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { settings } from "@/main/services/settings/settings.service";
import {
  FEDERATION_VERSION,
  GENERATED_DIR,
} from "@/main/services/supergraph-config/supergraph-config.constants";
import {
  type ConfigEntry,
  renderConfigYaml,
} from "@/main/services/supergraph-config/supergraph-config.utils";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import {
  type DisabledSubgraphs,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";

function configFilePath(variant: string): string {
  return join(GENERATED_DIR, `supergraph.${variant}.yaml`);
}

/**
 * Every subgraph rover should compose: its local URL where the developer
 * switched it local, its registry URL otherwise. Disabled subgraphs are left
 * out entirely — they never reach rover, so they can't fail composition.
 */
function buildEntries(
  subgraphs: RegisteredSubgraph[],
  overrides: OverrideMap,
  disabled: DisabledSubgraphs
): ConfigEntry[] {
  const entries: ConfigEntry[] = [];
  for (const subgraph of subgraphs) {
    if (disabled.includes(subgraph.name)) {
      continue;
    }
    const override = overrides[subgraph.name];
    const url =
      override !== undefined && override.local && override.port !== null
        ? `http://${settings.localAddress(override.port)}`
        : subgraph.routingUrl;
    entries.push({ name: subgraph.name, url });
  }
  return entries;
}

/** Writes the variant's full subgraph config and returns the file rover reads. */
export function writeSupergraphConfig(
  variant: string,
  subgraphs: RegisteredSubgraph[],
  overrides: OverrideMap,
  disabled: DisabledSubgraphs
): string {
  mkdirSync(GENERATED_DIR, { recursive: true });
  const path = configFilePath(variant);
  const yaml = renderConfigYaml(
    buildEntries(subgraphs, overrides, disabled),
    FEDERATION_VERSION
  );
  writeFileSync(path, yaml);
  return path;
}
