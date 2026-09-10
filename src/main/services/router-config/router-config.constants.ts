import { join } from "node:path";

import { GENERATED_DIR } from "@/main/services/supergraph-config/supergraph-config.constants";

/** Where the generated router configuration is written. */
export const ROUTER_CONFIG_FILE = join(GENERATED_DIR, "router.yaml");
