import { existsSync, readFileSync } from "node:fs";

import {
  checkCredentials,
  getSecretValue,
  startPortForward,
  stopPortForward,
} from "@/main/services/aws/aws.service";
import {
  CLIPBOARD_CLEAR_MS,
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
import { type Awaitable } from "@/shared/contract/contract.types";
import { type DatabasesContract } from "@/shared/databases/databases.contract";
import {
  type DatabaseCatalog,
  type DatabaseConnectionInfo,
  DatabaseConnectionState,
  type DatabaseRowState,
} from "@/shared/databases/databases.types";
import { ErrorKey } from "@/shared/errors/errors.types";

const READY_MARKER = /waiting for connections/i;
const PLUGIN_MISSING_MARKER = /SessionManagerPlugin is not found/i;

const connections = new Map<string, DatabaseRowState>();
const localPortOverrides = new Map<string, number>();

let writeToClipboard: (text: string) => void = function noopWriter() {};
let readClipboard: () => Promise<string> = function noopReader() {
  return Promise.resolve("");
};

/** Gives the service the clipboard writer it copies passwords through. */
export function registerClipboardWriter(writer: (text: string) => void): void {
  writeToClipboard = writer;
}

/** Gives the service the clipboard reader it checks before auto-clearing a copied password. */
export function registerClipboardReader(reader: () => Promise<string>): void {
  readClipboard = reader;
}

/**
 * Copies text to the clipboard, then clears it after CLIPBOARD_CLEAR_MS —
 * but only if the clipboard still holds exactly what was copied, so this
 * never clobbers something else the developer copied in the meantime.
 */
function copyToClipboardWithExpiration(text: string): void {
  writeToClipboard(text);
  setTimeout(function clear() {
    void readClipboard().then(function maybeClear(current) {
      if (current === text) {
        writeToClipboard("");
      }
    });
  }, CLIPBOARD_CLEAR_MS);
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

/** A database's config, under whichever of its environments happens to be listed first. */
function anyEntry(database: string): DatabaseConfigEntry | null {
  const environments = readConfigFile().databases[database];
  if (environments === undefined) {
    return null;
  }
  return Object.values(environments)[0] ?? null;
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

/** The local port a database's row should show: a session override, else its config default. */
function localPort(database: string): number {
  const override = localPortOverrides.get(database);
  if (override !== undefined) {
    return override;
  }
  return anyEntry(database)?.local_port ?? 0;
}

/** Overrides a database's local port for this session only. */
function updateLocalPort(database: string, port: number): number {
  localPortOverrides.set(database, port);
  return port;
}

/** Watches one database session's raw output for the lines that change its state. */
function watchSessionOutput(database: string, chunk: string): void {
  if (PLUGIN_MISSING_MARKER.test(chunk)) {
    reportDatabaseConnectionFailure(
      database,
      [ErrorKey.SessionManagerPluginMissing],
      chunk
    );
    connections.set(database, {
      state: DatabaseConnectionState.Disconnected,
      environment: null,
    });
    return;
  }

  if (READY_MARKER.test(chunk)) {
    clearDatabaseConnectionFailure(database);
    const current = connections.get(database);
    if (current !== undefined) {
      connections.set(database, {
        ...current,
        state: DatabaseConnectionState.Connected,
      });
    }
  }
}

/**
 * Whether a disconnect (or a competing connect) has replaced the
 * (database, targetEnvironment) attempt still running in connect().
 */
function wasSuperseded(database: string, targetEnvironment: string): boolean {
  const current = connections.get(database);
  return (
    current === undefined ||
    current.state !== DatabaseConnectionState.Connecting ||
    current.environment !== targetEnvironment
  );
}

/**
 * Connects to a (database, environment) pick. A no-op while that database is
 * already connecting or connected — under whichever environment it was
 * started with, not necessarily this one.
 */
async function connect(
  database: string,
  targetEnvironment: string
): Promise<DatabaseConnectionState> {
  const existing = connections.get(database);
  if (
    existing !== undefined &&
    existing.state !== DatabaseConnectionState.Disconnected
  ) {
    return existing.state;
  }

  const entry = lookupEntry(database, targetEnvironment);
  if (entry === null) {
    reportDatabaseConnectionFailure(
      database,
      [ErrorKey.DatabaseEntryMissing],
      null
    );
    return existing?.state ?? DatabaseConnectionState.Disconnected;
  }

  connections.set(database, {
    state: DatabaseConnectionState.Connecting,
    environment: targetEnvironment,
  });

  const credentials = await checkCredentials(entry.aws_profile);
  if (wasSuperseded(database, targetEnvironment)) {
    return DatabaseConnectionState.Disconnected;
  }
  if (!credentials.found) {
    reportDatabaseConnectionFailure(database, [ErrorKey.AwsCliMissing], null);
    connections.set(database, {
      state: DatabaseConnectionState.Disconnected,
      environment: null,
    });
    return DatabaseConnectionState.Disconnected;
  }
  if (!credentials.succeeded) {
    reportDatabaseConnectionFailure(
      database,
      [],
      credentials.stderr === "" ? credentials.stdout : credentials.stderr
    );
    connections.set(database, {
      state: DatabaseConnectionState.Disconnected,
      environment: null,
    });
    return DatabaseConnectionState.Disconnected;
  }

  const forward = await startPortForward(
    database,
    {
      target: entry.target_instance,
      host: entry.host,
      port: entry.port,
      localPort: localPortOverrides.get(database) ?? entry.local_port,
      profile: entry.aws_profile,
    },
    function onOutput(chunk) {
      watchSessionOutput(database, chunk);
    }
  );

  if (wasSuperseded(database, targetEnvironment)) {
    if (forward.started) {
      await stopPortForward(database);
    }
    return DatabaseConnectionState.Disconnected;
  }
  if (!forward.found) {
    reportDatabaseConnectionFailure(database, [ErrorKey.AwsCliMissing], null);
    connections.set(database, {
      state: DatabaseConnectionState.Disconnected,
      environment: null,
    });
    return DatabaseConnectionState.Disconnected;
  }
  if (!forward.started) {
    reportDatabaseConnectionFailure(database, [], forward.error);
    connections.set(database, {
      state: DatabaseConnectionState.Disconnected,
      environment: null,
    });
    return DatabaseConnectionState.Disconnected;
  }

  return DatabaseConnectionState.Connecting;
}

/** Disconnects one database's open session, if it has one. */
async function disconnect(database: string): Promise<DatabaseConnectionState> {
  await stopPortForward(database);
  connections.set(database, {
    state: DatabaseConnectionState.Disconnected,
    environment: null,
  });
  return DatabaseConnectionState.Disconnected;
}

/** Every database touched this session (connecting, connected, or failed), and its state. */
function statuses(): Record<string, DatabaseRowState> {
  return Object.fromEntries(connections);
}

/** Resolves a (database, environment) pick's password, or null if either lookup step fails. */
async function resolvePassword(
  database: string,
  targetEnvironment: string
): Promise<string | null> {
  const entry = lookupEntry(database, targetEnvironment);
  if (entry === null) {
    return null;
  }

  const secretId = secretIdFromPasswordUrl(entry.password_url);
  if (secretId === null) {
    return null;
  }

  const secret = await getSecretValue(
    secretId,
    entry.aws_profile,
    environment.awsRegion()
  );
  if (!secret.found) {
    reportDatabaseConnectionFailure(database, [ErrorKey.AwsCliMissing], null);
    return null;
  }
  if (!secret.succeeded) {
    reportDatabaseConnectionFailure(
      database,
      [],
      secret.stderr === "" ? secret.stdout : secret.stderr
    );
    return null;
  }
  return secret.password;
}

/** Copies a (database, environment) pick's password to the clipboard. The secret itself never crosses IPC. */
async function copyPasswordToClipboard(
  database: string,
  targetEnvironment: string
): Promise<boolean> {
  const password = await resolvePassword(database, targetEnvironment);
  if (password === null) {
    return false;
  }
  copyToClipboardWithExpiration(password);
  return true;
}

/** Same as `copyPasswordToClipboard`, URL-encoded for pasting into a connection-string URI. */
async function copyPasswordUrlEncodedToClipboard(
  database: string,
  targetEnvironment: string
): Promise<boolean> {
  const password = await resolvePassword(database, targetEnvironment);
  if (password === null) {
    return false;
  }
  copyToClipboardWithExpiration(encodeURIComponent(password));
  return true;
}

export const databases: Awaitable<DatabasesContract> = {
  catalog,
  connectionInfo,
  connect,
  disconnect,
  statuses,
  localPort,
  updateLocalPort,
  copyPasswordToClipboard,
  copyPasswordUrlEncodedToClipboard,
};
