import { join } from "node:path";

/** Where generated rover configuration is written. */
export const GENERATED_DIR = join(process.cwd(), "_generated");

/** Pinned so composition doesn't drift between developers. */
export const FEDERATION_VERSION = "=2.8.5";

/** Where rover's stdout and stderr land while it runs, overwritten each time it starts. */
export const ROVER_LOG_FILE = join(GENERATED_DIR, "rover.log");
