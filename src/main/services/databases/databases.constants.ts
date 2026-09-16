import { join } from "node:path";

import { GENERATED_DIR } from "@/main/services/rover/rover.constants";

/** The file the app reads its database catalog from, gitignored like `.env`. */
export const DATABASES_CONFIG_FILE = join(process.cwd(), "databases.json");

/** Where the port-forwarding session's stdout and stderr land, overwritten each time it starts. */
export const DATABASE_CONNECTION_LOG_FILE = join(
  GENERATED_DIR,
  "database-connection.log"
);
