import { join } from "node:path";

/** The file the app reads its database catalog from, gitignored like `.env`. */
export const DATABASES_CONFIG_FILE = join(process.cwd(), "databases.json");

/** How long a copied password sits on the clipboard before it's cleared. */
export const CLIPBOARD_CLEAR_MS = 30_000;
