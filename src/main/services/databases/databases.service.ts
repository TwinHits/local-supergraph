import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import {
  checkCredentials,
  getSecretValue,
  startPortForward,
  stopPortForward,
} from "@/main/services/aws/aws.service";
import {
  DATABASE_CONNECTION_LOG_FILE,
  DATABASES_CONFIG_FILE,
} from "@/main/services/databases/databases.constants";
import {
  type DatabaseConfigEntry,
  type DatabasesConfigFile,
} from "@/main/services/databases/databases.types";
import { environment } from "@/main/services/environment/environment.service";
import {
  clearDatabaseConnectionFailure,
  reportDatabaseConnectionFailure,
} from "@/main/services/errors/errors.service";
import { GENERATED_DIR } from "@/main/services/rover/rover.constants";
import {
  selectedDatabase,
  selectedEnvironment,
  updateSelectedDatabase,
  updateSelectedEnvironment,
} from "@/main/services/settings/settings.service";
import { type Awaitable } from "@/shared/contract/contract.types";
import { type DatabasesContract } from "@/shared/databases/databases.contract";
import {
  type DatabaseCatalog,
  type DatabaseConnectionInfo,
  DatabaseConnectionState,
} from "@/shared/databases/databases.types";
import { ErrorKey } from "@/shared/errors/errors.types";

const READY_MARKER = /waiting for connections/i;
const PLUGIN_MISSING_MARKER = /SessionManagerPlugin is not found/i;

let state: DatabaseConnectionState = DatabaseConnectionState.Disconnected;

let writeToClipboard: (text: string) => void = function noopWriter() {};

/** Gives the service the clipboard writer it copies passwords through. */
export function registerClipboardWriter(writer: (text: string) => void): void {
  writeToClipboard = writer;
}

/** Reads databases.json fresh, since it may be hand-edited without restarting the app. */
function readConfigFile(): DatabasesConfigFile {
  if (!existsSync(DATABASES_CONFIG_FILE)) {
    return { databases: {} };
  }
  try {
    return JSON.parse(
      readFileSync(DATABASES_CONFIG_FILE, "utf8")
    ) as DatabasesConfigFile;
  } catch {
    return { databases: {} };
  }
}

/** One (database, environment) pick's config, or null if either isn't in the file. */
function lookupEntry(
  database: string,
  targetEnvironment: string
): DatabaseConfigEntry | null {
  return readConfigFile().databases[database]?.[targetEnvironment] ?? null;
}

/** Pulls the Secrets Manager id out of the config's console URL. */
function secretIdFromPasswordUrl(passwordUrl: string): string | null {
  try {
    return new URL(passwordUrl).searchParams.get("name");
  } catch {
    return null;
  }
}

/** Every database, and the environments it can be reached in. */
function catalog(): DatabaseCatalog {
  const config = readConfigFile();
  const result: DatabaseCatalog = {};
  for (const [database, environments] of Object.entries(config.databases)) {
    result[database] = Object.keys(environments);
  }
  return result;
}

/** What a DB client needs to connect, for one (database, environment) pick. */
function connectionInfo(
  database: string,
  targetEnvironment: string
): DatabaseConnectionInfo | null {
  const entry = lookupEntry(database, targetEnvironment);
  if (entry === null) {
    return null;
  }
  return {
    host: entry.host,
    port: entry.port,
    localPort: entry.local_port,
    databaseName: entry.database_name,
    username: entry.username,
  };
}

/** Appends the session's raw output to its log, and watches for the lines that change its state. */
function watchSessionOutput(chunk: string): void {
  appendFileSync(DATABASE_CONNECTION_LOG_FILE, chunk);

  if (PLUGIN_MISSING_MARKER.test(chunk)) {
    reportDatabaseConnectionFailure(
      [ErrorKey.SessionManagerPluginMissing],
      chunk
    );
    state = DatabaseConnectionState.Disconnected;
    return;
  }

  if (READY_MARKER.test(chunk)) {
    clearDatabaseConnectionFailure();
    state = DatabaseConnectionState.Connected;
  }
}

/** Connects to a (database, environment) pick. A no-op while already connecting or connected. */
async function connect(
  database: string,
  targetEnvironment: string
): Promise<DatabaseConnectionState> {
  if (state !== DatabaseConnectionState.Disconnected) {
    return state;
  }

  const entry = lookupEntry(database, targetEnvironment);
  if (entry === null) {
    return state;
  }

  state = DatabaseConnectionState.Connecting;

  const credentials = await checkCredentials(entry.aws_profile);
  if (!credentials.found) {
    reportDatabaseConnectionFailure([ErrorKey.AwsCliMissing], null);
    state = DatabaseConnectionState.Disconnected;
    return state;
  }
  if (!credentials.succeeded) {
    reportDatabaseConnectionFailure(
      [ErrorKey.AwsSsoExpired],
      credentials.stderr === "" ? credentials.stdout : credentials.stderr
    );
    state = DatabaseConnectionState.Disconnected;
    return state;
  }

  mkdirSync(GENERATED_DIR, { recursive: true });
  writeFileSync(DATABASE_CONNECTION_LOG_FILE, "");

  const forward = await startPortForward(
    {
      target: entry.target_instance,
      host: entry.host,
      port: entry.port,
      localPort: entry.local_port,
      profile: entry.aws_profile,
    },
    watchSessionOutput
  );

  if (!forward.found) {
    reportDatabaseConnectionFailure([ErrorKey.AwsCliMissing], null);
    state = DatabaseConnectionState.Disconnected;
    return state;
  }
  if (!forward.started) {
    reportDatabaseConnectionFailure([], forward.error);
    state = DatabaseConnectionState.Disconnected;
    return state;
  }

  return state;
}

/** Disconnects the open session, if there is one. */
async function disconnect(): Promise<DatabaseConnectionState> {
  await stopPortForward();
  state = DatabaseConnectionState.Disconnected;
  return state;
}

/** Copies a (database, environment) pick's password to the clipboard. The secret itself never crosses IPC. */
async function copyPasswordToClipboard(
  database: string,
  targetEnvironment: string
): Promise<boolean> {
  const entry = lookupEntry(database, targetEnvironment);
  if (entry === null) {
    return false;
  }

  const secretId = secretIdFromPasswordUrl(entry.password_url);
  if (secretId === null) {
    return false;
  }

  const secret = await getSecretValue(
    secretId,
    entry.aws_profile,
    environment.awsRegion()
  );
  if (!secret.found) {
    reportDatabaseConnectionFailure([ErrorKey.AwsCliMissing], null);
    return false;
  }
  if (secret.password === null) {
    return false;
  }

  writeToClipboard(secret.password);
  return true;
}

export const databases: Awaitable<DatabasesContract> = {
  catalog,
  connectionInfo,
  connect,
  disconnect,
  status(): DatabaseConnectionState {
    return state;
  },
  copyPasswordToClipboard,
  selectedDatabase,
  updateSelectedDatabase,
  selectedEnvironment,
  updateSelectedEnvironment,
};
