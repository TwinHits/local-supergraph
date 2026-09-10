import { mkdirSync, writeFileSync } from "node:fs";

import { ROUTER_CONFIG_FILE } from "@/main/services/router-config/router-config.constants";
import { renderRouterConfigYaml } from "@/main/services/router-config/router-config.utils";
import { GENERATED_DIR } from "@/main/services/supergraph-config/supergraph-config.constants";

/** Writes the router configuration and returns the file rover reads. */
export function writeRouterConfig(): string {
  mkdirSync(GENERATED_DIR, { recursive: true });
  writeFileSync(ROUTER_CONFIG_FILE, renderRouterConfigYaml());
  return ROUTER_CONFIG_FILE;
}
