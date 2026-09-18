import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { DatabaseConnectionState } from "@/shared/databases/databases.types";
import { ErrorKey } from "@/shared/errors/errors.types";

const CONFIG_DIR = mkdtempSync(
  join(tmpdir(), "local-supergraph-databases-config-")
);
const DATABASES_CONFIG_FILE = join(CONFIG_DIR, "databases.json");

vi.mock(
  "@/main/services/databases/databases.constants",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/main/services/databases/databases.constants")
      >();
    return { ...actual, DATABASES_CONFIG_FILE };
  }
);

vi.mock("@/main/services/environment/environment.service", () => ({
  environment: {
    awsRegion: () => "us-east-1",
  },
}));

const sessionState = vi.hoisted(() => ({
  onOutput: new Map<string, (chunk: string) => void>(),
}));

const awsState = vi.hoisted(() => ({
  checkCredentials: vi.fn(),
  getSecretValue: vi.fn(),
  startPortForward: vi.fn(),
  stopPortForward: vi.fn(),
  ssoLogin: vi.fn(),
}));

vi.mock("@/main/services/aws/aws.service", () => ({
  checkCredentials: (...args: unknown[]) => awsState.checkCredentials(...args),
  getSecretValue: (...args: unknown[]) => awsState.getSecretValue(...args),
  startPortForward: (...args: unknown[]) => {
    const [id, , onOutput] = args as [string, unknown, (chunk: string) => void];
    sessionState.onOutput.set(id, onOutput);
    return awsState.startPortForward(...args);
  },
  stopPortForward: (...args: unknown[]) => awsState.stopPortForward(...args),
  ssoLogin: (...args: unknown[]) => awsState.ssoLogin(...args),
}));

const CONFIG_FIXTURE = {
  databases: {
    TEAM_MEMBER: {
      dev: {
        target_instance: "i-0f8d1aa5cbf4b87a1",
        host: "team-member.example.com",
        port: 5432,
        local_port: 5432,
        aws_profile: "omfsvcshubdev",
        database_name: "team_member_subgraph",
        username: "tm_user",
        password_url:
          "https://example.com/secretsmanager/secret?name=rds%21cluster-abc&region=us-east-1",
      },
      prod: {
        target_instance: "i-0cde9921dd8328ed9",
        host: "team-member-prod.example.com",
        port: 5432,
        local_port: 5433,
        aws_profile: "omfsvcshubprod",
        database_name: "team_member_subgraph",
        username: "tm_user_prod",
        password_url:
          "https://example.com/secretsmanager/secret?name=no-bang-secret&region=us-east-1",
      },
    },
  },
};

function writeConfigFile(config: unknown): void {
  writeFileSync(DATABASES_CONFIG_FILE, JSON.stringify(config));
}

function removeConfigFile(): void {
  writeFileSync(DATABASES_CONFIG_FILE, "");
  rmSync(DATABASES_CONFIG_FILE, { force: true });
}

beforeEach(function isolate() {
  vi.resetModules();
  removeConfigFile();
  sessionState.onOutput.clear();
  awsState.checkCredentials.mockReset();
  awsState.getSecretValue.mockReset();
  awsState.startPortForward.mockReset();
  awsState.stopPortForward.mockReset().mockResolvedValue(undefined);
  awsState.ssoLogin.mockReset();
});

afterEach(function restoreMocks() {
  vi.restoreAllMocks();
});

afterAll(function removeTempDirs() {
  rmSync(CONFIG_DIR, { recursive: true, force: true });
});

async function freshDatabases() {
  const { databases } =
    await import("@/main/services/databases/databases.service");
  const { errors, reportDatabaseConnectionFailure } =
    await import("@/main/services/errors/errors.service");
  return { databases, errors, reportDatabaseConnectionFailure };
}

/** Reads the keys off a list of diagnoses. */
function keysOf(diagnoses: { key: ErrorKey }[]): ErrorKey[] {
  return diagnoses.map(function key(each) {
    return each.key;
  });
}

describe("the catalog reflects databases.json: database name to its environments", () => {
  it("is empty when the file is missing", async () => {
    const { databases } = await freshDatabases();

    expect(databases.catalog()).toEqual({});
  });

  it("lists every environment under each database", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();

    expect(databases.catalog()).toEqual({ TEAM_MEMBER: ["dev", "prod"] });
  });

  it("is empty when the file fails to parse", async () => {
    writeFileSync(DATABASES_CONFIG_FILE, "{not json");
    const { databases } = await freshDatabases();

    expect(databases.catalog()).toEqual({});
  });
});

describe("connection info comes from the matching (database, environment) entry, password excluded", () => {
  it("resolves a known pick's connection details", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();

    const actual = databases.connectionInfo("TEAM_MEMBER", "dev");

    expect(actual).toEqual({
      host: "team-member.example.com",
      port: 5432,
      localPort: 5432,
      databaseName: "team_member_subgraph",
      username: "tm_user",
    });
  });

  it("resolves null for an unknown database or environment", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();

    expect(databases.connectionInfo("TEAM_MEMBER", "staging")).toBeNull();
    expect(databases.connectionInfo("NOT_A_DATABASE", "dev")).toBeNull();
  });
});

describe("local ports are scoped per (database, environment), not shared across a database's environments", () => {
  it("defaults every environment to its own config entry's local_port", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();

    expect(databases.localPorts()).toEqual({
      TEAM_MEMBER: { dev: 5432, prod: 5433 },
    });
  });

  it("overriding one environment's port does not affect the same database's other environment", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();

    databases.updateLocalPort("TEAM_MEMBER", "dev", 9999);

    expect(databases.localPorts()).toEqual({
      TEAM_MEMBER: { dev: 9999, prod: 5433 },
    });
  });
});

describe("connecting checks credentials before ever starting a session", () => {
  it("reports AwsCliMissing and stays disconnected when aws isn't found", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: false,
      succeeded: false,
      stdout: "",
      stderr: "",
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.connect("TEAM_MEMBER", "dev");

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.AwsCliMissing
    );
    expect(awsState.startPortForward).not.toHaveBeenCalled();
  });

  it("reports AwsSsoExpired and stays disconnected when credentials are stale", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: false,
      stdout: "",
      stderr: "The SSO session has expired",
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.connect("TEAM_MEMBER", "dev");

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.AwsSsoExpired
    );
    expect(awsState.startPortForward).not.toHaveBeenCalled();
  });

  it("reports DatabaseEntryMissing and stays disconnected for a pick that isn't in the catalog", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases, errors } = await freshDatabases();

    const actual = await databases.connect("NOT_A_DATABASE", "dev");

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect(awsState.checkCredentials).not.toHaveBeenCalled();
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.DatabaseEntryMissing
    );
  });

  it("starts the port-forwarding session once credentials are valid", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: true,
      found: true,
      error: null,
    });
    const { databases } = await freshDatabases();

    const actual = await databases.connect("TEAM_MEMBER", "dev");

    expect(actual).toBe(DatabaseConnectionState.Connecting);
    expect(awsState.startPortForward).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      {
        target: "i-0f8d1aa5cbf4b87a1",
        host: "team-member.example.com",
        port: 5432,
        localPort: 5432,
        profile: "omfsvcshubdev",
      },
      expect.any(Function)
    );
  });

  it("uses the target environment's own local_port, not another environment's", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: true,
      found: true,
      error: null,
    });
    const { databases } = await freshDatabases();

    await databases.connect("TEAM_MEMBER", "prod");

    expect(awsState.startPortForward).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      expect.objectContaining({ localPort: 5433 }),
      expect.any(Function)
    );
  });

  it("prefers a session-only local port override over the config default", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: true,
      found: true,
      error: null,
    });
    const { databases } = await freshDatabases();
    databases.updateLocalPort("TEAM_MEMBER", "dev", 9999);

    await databases.connect("TEAM_MEMBER", "dev");

    expect(awsState.startPortForward).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      expect.objectContaining({ localPort: 9999 }),
      expect.any(Function)
    );
  });

  it("is a no-op while already connecting or connected", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: true,
      found: true,
      error: null,
    });
    const { databases } = await freshDatabases();
    await databases.connect("TEAM_MEMBER", "dev");

    await databases.connect("TEAM_MEMBER", "prod");

    expect(awsState.checkCredentials).toHaveBeenCalledOnce();
  });

  it("reports AwsCliMissing when the session fails to spawn because aws is missing", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: false,
      found: false,
      error: null,
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.connect("TEAM_MEMBER", "dev");

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.AwsCliMissing
    );
  });

  it("reports the spawn error when the session fails to start for another reason", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: false,
      found: true,
      error: "EACCES",
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.connect("TEAM_MEMBER", "dev");

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect(errors.databaseConnectionErrors().length).toBeGreaterThan(0);
  });
});

describe("a disconnect that lands while connect() is still in flight always wins", () => {
  it("does not leave the database connecting if disconnected while credentials are still resolving", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    let resolveCredentials: (value: {
      found: boolean;
      succeeded: boolean;
      stdout: string;
      stderr: string;
    }) => void = () => {};
    awsState.checkCredentials.mockImplementationOnce(
      () =>
        new Promise(function pending(resolve) {
          resolveCredentials = resolve;
        })
    );
    const { databases } = await freshDatabases();

    const connecting = databases.connect("TEAM_MEMBER", "dev");
    await databases.disconnect("TEAM_MEMBER");
    resolveCredentials({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    const actual = await connecting;

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect((await databases.statuses()).TEAM_MEMBER?.state).toBe(
      DatabaseConnectionState.Disconnected
    );
    expect(awsState.startPortForward).not.toHaveBeenCalled();
  });

  it("stops a port forward that already started if disconnected before connect() settles", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    let resolveForward: (value: {
      started: boolean;
      found: boolean;
      error: string | null;
    }) => void = () => {};
    awsState.startPortForward.mockImplementationOnce(
      () =>
        new Promise(function pending(resolve) {
          resolveForward = resolve;
        })
    );
    const { databases } = await freshDatabases();

    const connecting = databases.connect("TEAM_MEMBER", "dev");
    await Promise.resolve();
    await Promise.resolve();
    expect(awsState.startPortForward).toHaveBeenCalledOnce();

    await databases.disconnect("TEAM_MEMBER");
    resolveForward({ started: true, found: true, error: null });
    const actual = await connecting;

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect((await databases.statuses()).TEAM_MEMBER?.state).toBe(
      DatabaseConnectionState.Disconnected
    );
    expect(awsState.stopPortForward).toHaveBeenCalledTimes(2);
    expect(awsState.stopPortForward).toHaveBeenCalledWith("TEAM_MEMBER");
  });
});

describe("the open session's own output drives its state from Connecting to Connected", () => {
  async function connectSuccessfully(databases: {
    connect: (
      database: string,
      environment: string
    ) => DatabaseConnectionState | Promise<DatabaseConnectionState>;
  }): Promise<void> {
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: true,
      found: true,
      error: null,
    });
    await databases.connect("TEAM_MEMBER", "dev");
  }

  it("becomes connected once the session announces it's forwarding", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();
    await connectSuccessfully(databases);

    sessionState.onOutput.get("TEAM_MEMBER")?.("Waiting for connections...\n");

    expect((await databases.statuses()).TEAM_MEMBER?.state).toBe(
      DatabaseConnectionState.Connected
    );
  });

  it("reports SessionManagerPluginMissing and disconnects when the plugin isn't installed", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases, errors } = await freshDatabases();
    await connectSuccessfully(databases);

    sessionState.onOutput.get("TEAM_MEMBER")?.(
      "SessionManagerPlugin is not found.\n"
    );

    expect((await databases.statuses()).TEAM_MEMBER?.state).toBe(
      DatabaseConnectionState.Disconnected
    );
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.SessionManagerPluginMissing
    );
  });

  it("stops the session's process so a retry doesn't find the id still taken", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();
    await connectSuccessfully(databases);

    sessionState.onOutput.get("TEAM_MEMBER")?.(
      "SessionManagerPlugin is not found.\n"
    );

    expect(awsState.stopPortForward).toHaveBeenCalledWith("TEAM_MEMBER");
  });
});

describe("disconnecting always returns to disconnected", () => {
  it("stops the session and resolves disconnected", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "{}",
      stderr: "",
    });
    awsState.startPortForward.mockResolvedValue({
      started: true,
      found: true,
      error: null,
    });
    const { databases } = await freshDatabases();
    await databases.connect("TEAM_MEMBER", "dev");

    const actual = await databases.disconnect("TEAM_MEMBER");

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
    expect(awsState.stopPortForward).toHaveBeenCalledWith("TEAM_MEMBER");
  });

  it("is safe to call while already disconnected", async () => {
    const { databases } = await freshDatabases();

    const actual = await databases.disconnect("TEAM_MEMBER");

    expect(actual).toBe(DatabaseConnectionState.Disconnected);
  });

  it("forgets the database's last reported failure, so it doesn't outlive the disconnect", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases, errors, reportDatabaseConnectionFailure } =
      await freshDatabases();
    reportDatabaseConnectionFailure(
      "TEAM_MEMBER",
      [ErrorKey.SessionManagerPluginMissing],
      ""
    );

    await databases.disconnect("TEAM_MEMBER");

    expect(errors.databaseConnectionErrors()).toEqual([]);
  });
});

describe("copying the password writes the secret to the clipboard, never returning it", () => {
  it("writes the resolved password and resolves true", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.getSecretValue.mockResolvedValue({
      password: "s3cr3t",
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });
    const { databases } = await freshDatabases();
    const writer = vi.fn();
    const module = await import("@/main/services/databases/databases.service");
    module.registerClipboardWriter(writer);

    const actual = await databases.copyPasswordToClipboard(
      "TEAM_MEMBER",
      "dev"
    );

    expect(actual).toBe(true);
    expect(writer).toHaveBeenCalledWith("s3cr3t");
    expect(awsState.getSecretValue).toHaveBeenCalledWith(
      "rds!cluster-abc",
      "omfsvcshubdev",
      "us-east-1"
    );
  });

  it("resolves false for a pick that isn't in the catalog", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();

    const actual = await databases.copyPasswordToClipboard(
      "NOT_A_DATABASE",
      "dev"
    );

    expect(actual).toBe(false);
    expect(awsState.getSecretValue).not.toHaveBeenCalled();
  });

  it("resolves false when the password_url has no secret id", async () => {
    writeConfigFile({
      databases: {
        BROKEN: {
          dev: {
            ...CONFIG_FIXTURE.databases.TEAM_MEMBER.dev,
            password_url: "https://example.com/secretsmanager/secret",
          },
        },
      },
    });
    const { databases } = await freshDatabases();

    const actual = await databases.copyPasswordToClipboard("BROKEN", "dev");

    expect(actual).toBe(false);
    expect(awsState.getSecretValue).not.toHaveBeenCalled();
  });

  it("reports AwsCliMissing and resolves false when aws isn't found", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.getSecretValue.mockResolvedValue({
      password: null,
      found: false,
      succeeded: false,
      stdout: "",
      stderr: "",
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.copyPasswordToClipboard(
      "TEAM_MEMBER",
      "dev"
    );

    expect(actual).toBe(false);
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.AwsCliMissing
    );
  });

  it("reports an error and resolves false when the secret lookup fails for another reason", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.getSecretValue.mockResolvedValue({
      password: null,
      found: true,
      succeeded: false,
      stdout: "",
      stderr: "access denied",
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.copyPasswordToClipboard(
      "TEAM_MEMBER",
      "dev"
    );

    expect(actual).toBe(false);
    expect(errors.databaseConnectionErrors().length).toBeGreaterThan(0);
  });
});

describe("signing back in through AWS SSO uses the pick's own configured profile", () => {
  it("resolves false and reports DatabaseEntryMissing for a pick that isn't in the catalog", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases, errors } = await freshDatabases();

    const actual = await databases.ssoLogin("NOT_A_DATABASE", "dev");

    expect(actual).toBe(false);
    expect(awsState.ssoLogin).not.toHaveBeenCalled();
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.DatabaseEntryMissing
    );
  });

  it("signs in with the (database, environment) pick's own aws_profile, not another environment's", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.ssoLogin.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });
    const { databases } = await freshDatabases();

    await databases.ssoLogin("TEAM_MEMBER", "prod");

    expect(awsState.ssoLogin).toHaveBeenCalledWith("omfsvcshubprod");
  });

  it("uses the environment its own connect() attempt last targeted over whatever environment is passed in", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: false,
      stdout: "",
      stderr: "The SSO session has expired",
    });
    const { databases } = await freshDatabases();
    await databases.connect("TEAM_MEMBER", "dev");
    awsState.ssoLogin.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });

    // The failure actually happened under "dev", but the caller (e.g. a
    // renderer that has since switched its toolbar) passes "prod".
    await databases.ssoLogin("TEAM_MEMBER", "prod");

    expect(awsState.ssoLogin).toHaveBeenCalledWith("omfsvcshubdev");
  });

  it("falls back to the given environment when connect() was never attempted for that database", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.ssoLogin.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });
    const { databases } = await freshDatabases();

    await databases.ssoLogin("TEAM_MEMBER", "prod");

    expect(awsState.ssoLogin).toHaveBeenCalledWith("omfsvcshubprod");
  });

  it("reports AwsCliMissing and resolves false when aws isn't found", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.ssoLogin.mockResolvedValue({
      found: false,
      succeeded: false,
      stdout: "",
      stderr: "",
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.ssoLogin("TEAM_MEMBER", "dev");

    expect(actual).toBe(false);
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.AwsCliMissing
    );
  });

  it("reports the failure and resolves false when sign-in itself fails", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.ssoLogin.mockResolvedValue({
      found: true,
      succeeded: false,
      stdout: "",
      stderr: "The config profile (omfsvcshubdev) could not be found",
    });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.ssoLogin("TEAM_MEMBER", "dev");

    expect(actual).toBe(false);
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.AwsProfileMissing
    );
  });

  it("clears the database's failure and resolves true once signed in, without retrying the connection", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.checkCredentials.mockResolvedValue({
      found: true,
      succeeded: false,
      stdout: "",
      stderr: "The SSO session has expired",
    });
    const { databases, errors } = await freshDatabases();
    await databases.connect("TEAM_MEMBER", "dev");
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      ErrorKey.AwsSsoExpired
    );
    awsState.ssoLogin.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });

    const actual = await databases.ssoLogin("TEAM_MEMBER", "dev");

    expect(actual).toBe(true);
    expect(errors.databaseConnectionErrors()).toEqual([]);
    expect(awsState.startPortForward).not.toHaveBeenCalled();
  });

  it("clears every database that shares the same profile under the same environment, not just the one that triggered it", async () => {
    writeConfigFile({
      databases: {
        TEAM_MEMBER: {
          dev: { ...CONFIG_FIXTURE.databases.TEAM_MEMBER.dev },
        },
        OTHER_MEMBER: {
          dev: {
            ...CONFIG_FIXTURE.databases.TEAM_MEMBER.dev,
            target_instance: "i-0other",
            host: "other-member.example.com",
          },
        },
      },
    });
    const { databases, errors, reportDatabaseConnectionFailure } =
      await freshDatabases();
    reportDatabaseConnectionFailure(
      "TEAM_MEMBER",
      [ErrorKey.AwsSsoExpired],
      ""
    );
    reportDatabaseConnectionFailure(
      "OTHER_MEMBER",
      [ErrorKey.AwsSsoExpired],
      ""
    );
    awsState.ssoLogin.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });

    await databases.ssoLogin("TEAM_MEMBER", "dev");

    expect(errors.databaseConnectionErrors()).toEqual([]);
  });

  it("does not clear a database whose entry under that environment uses a different profile", async () => {
    writeConfigFile({
      databases: {
        TEAM_MEMBER: {
          dev: { ...CONFIG_FIXTURE.databases.TEAM_MEMBER.dev },
        },
        OTHER_MEMBER: {
          dev: {
            ...CONFIG_FIXTURE.databases.TEAM_MEMBER.dev,
            aws_profile: "a-different-profile",
          },
        },
      },
    });
    const { databases, errors, reportDatabaseConnectionFailure } =
      await freshDatabases();
    reportDatabaseConnectionFailure(
      "TEAM_MEMBER",
      [ErrorKey.AwsSsoExpired],
      ""
    );
    reportDatabaseConnectionFailure(
      "OTHER_MEMBER",
      [ErrorKey.AwsSsoExpired],
      ""
    );
    awsState.ssoLogin.mockResolvedValue({
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });

    await databases.ssoLogin("TEAM_MEMBER", "dev");

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsSsoExpired,
    ]);
  });
});
