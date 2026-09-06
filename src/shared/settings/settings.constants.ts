import { type Settings } from "@/shared/settings/settings.types";

/** Everything local runs on this host: the router, and every local subgraph. */
export const LOCAL_HOST = "localhost";

export const DEFAULT_SETTINGS: Settings = {
  routerPort: 4041,
};
