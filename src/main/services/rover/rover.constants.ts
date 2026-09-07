import { homedir } from "node:os";
import { join } from "node:path";

/** Where rover's installer puts the binary. */
export const INSTALLED_PATH = join(homedir(), ".rover", "bin", "rover");

/** What to run when the install path holds nothing. */
export const PATH_COMMAND = "rover";

/** Node's error code for a command it could not find. */
export const NOT_FOUND_CODE = "ENOENT";
