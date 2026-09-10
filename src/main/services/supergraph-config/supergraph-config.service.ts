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
import { type OverrideMap } from "@/shared/subgraph/subgraph.types";

function configFilePath(variant: string): string {
  return join(GENERATED_DIR, `supergraph.${variant}.yaml`);
}

/** The subgraphs switched to local, and the URL each now answers on. */
function buildOverrideEntries(
  subgraphs: RegisteredSubgraph[],
  overrides: OverrideMap
): ConfigEntry[] {
  const entries: ConfigEntry[] = [];
  for (const subgraph of subgraphs) {
    const override = overrides[subgraph.name];
    if (override !== undefined && override.local && override.port !== null) {
      entries.push({
        name: subgraph.name,
        url: `http://${settings.localAddress(override.port)}`,
      });
    }
  }
  return entries;
}

/** Writes the variant's override config and returns the file rover reads. */
export function writeSupergraphConfig(
  variant: string,
  subgraphs: RegisteredSubgraph[],
  overrides: OverrideMap
): string {
  mkdirSync(GENERATED_DIR, { recursive: true });
  const path = configFilePath(variant);
  const yaml = renderConfigYaml(
    buildOverrideEntries(subgraphs, overrides),
    FEDERATION_VERSION
  );
  writeFileSync(path, yaml);
  return path;
}
