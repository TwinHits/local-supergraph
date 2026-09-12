import { homedir } from "node:os";
import { join } from "node:path";

/** Where rover's installer puts the binary. */
export const INSTALLED_PATH = join(homedir(), ".rover", "bin", "rover");

/** What to run when the install path holds nothing. */
export const PATH_COMMAND = "rover";

/** Node's error code for a command it could not find. */
export const NOT_FOUND_CODE = "ENOENT";

/** How long to wait after SIGTERM before sending SIGKILL. */
export const SHUTDOWN_GRACE_MS = 5000;

/** How often to check whether the router port has come free while stopping. */
export const PORT_FREE_POLL_MS = 100;

/** How long to poll for the router port before forcing the group down. */
export const PORT_FREE_TIMEOUT_MS = 5000;

/** Where generated rover configuration is written. */
export const GENERATED_DIR = join(process.cwd(), "_generated");

/** Pinned so composition doesn't drift between developers. */
export const FEDERATION_VERSION = "=2.8.5";

/** Where rover's stdout and stderr land while it runs, overwritten each time it starts. */
export const ROVER_LOG_FILE = join(GENERATED_DIR, "rover.log");

/** Where the generated router configuration is written. */
export const ROUTER_CONFIG_FILE = join(GENERATED_DIR, "router.yaml");
