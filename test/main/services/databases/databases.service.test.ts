import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const GENERATED_DIR = mkdtempSync(
  join(tmpdir(), "local-supergraph-databases-generated-")
);
const CONFIG_DIR = mkdtempSync(
  join(tmpdir(), "local-supergraph-databases-config-")
);
const DATABASES_CONFIG_FILE = join(CONFIG_DIR, "databases.json");
const DATABASE_CONNECTION_LOG_FILE = join(
  GENERATED_DIR,
  "database-connection.log"
);

vi.mock("@/main/services/rover/rover.constants", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/main/services/rover/rover.constants")
    >();
  return { ...actual, GENERATED_DIR };
});

vi.mock(
  "@/main/services/databases/databases.constants",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/main/services/databases/databases.constants")
      >();
    return {
      ...actual,
      DATABASES_CONFIG_FILE,
      DATABASE_CONNECTION_LOG_FILE,
    };
  }
);

vi.mock("@/main/services/environment/environment.service", () => ({
  environment: {
    awsRegion: () => "us-east-1",
  },
}));

const sessionState = vi.hoisted(() => ({
  onOutput: null as ((chunk: string) => void) | null,
}));

const awsState = vi.hoisted(() => ({
  checkCredentials: vi.fn(),
  getSecretValue: vi.fn(),
  startPortForward: vi.fn(),
  stopPortForward: vi.fn(),
}));

vi.mock("@/main/services/aws/aws.service", () => ({
  checkCredentials: (...args: unknown[]) => awsState.checkCredentials(...args),
  getSecretValue: (...args: unknown[]) => awsState.getSecretValue(...args),
  startPortForward: (...args: unknown[]) => {
    const [params, onOutput] = args as [unknown, (chunk: string) => void];
    sessionState.onOutput = onOutput;
    return awsState.startPortForward(params, onOutput);
  },
  stopPortForward: (...args: unknown[]) => awsState.stopPortForward(...args),
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
        local_port: 5432,
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
  sessionState.onOutput = null;
  awsState.checkCredentials.mockReset();
  awsState.getSecretValue.mockReset();
  awsState.startPortForward.mockReset();
  awsState.stopPortForward.mockReset().mockResolvedValue(undefined);
});

afterEach(function restoreMocks() {
  vi.restoreAllMocks();
});

afterAll(function removeTempDirs() {
  rmSync(GENERATED_DIR, { recursive: true, force: true });
  rmSync(CONFIG_DIR, { recursive: true, force: true });
});

async function freshDatabases() {
  const { databases } =
    await import("@/main/services/databases/databases.service");
  const { errors } = await import("@/main/services/errors/errors.service");
  return { databases, errors };
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

    expect(actual).toBe("disconnected");
    expect(errors.databaseConnectionErrors()[0]?.key).toBe("AWS_CLI_MISSING");
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

    expect(actual).toBe("disconnected");
    expect(errors.databaseConnectionErrors()[0]?.key).toBe("AWS_SSO_EXPIRED");
    expect(awsState.startPortForward).not.toHaveBeenCalled();
  });

  it("is a no-op for a pick that isn't in the catalog", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases } = await freshDatabases();

    const actual = await databases.connect("NOT_A_DATABASE", "dev");

    expect(actual).toBe("disconnected");
    expect(awsState.checkCredentials).not.toHaveBeenCalled();
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

    expect(actual).toBe("connecting");
    expect(awsState.startPortForward).toHaveBeenCalledWith(
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

    expect(actual).toBe("disconnected");
    expect(errors.databaseConnectionErrors()[0]?.key).toBe("AWS_CLI_MISSING");
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

    expect(actual).toBe("disconnected");
    expect(errors.databaseConnectionErrors().length).toBeGreaterThan(0);
  });
});

describe("the open session's own output drives its state from Connecting to Connected", () => {
  async function connectSuccessfully(databases: {
    connect: (
      database: string,
      environment: string
    ) => Promise<string> | string;
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

    sessionState.onOutput?.("Waiting for connections...\n");

    expect(databases.status()).toBe("connected");
    expect(readFileSync(DATABASE_CONNECTION_LOG_FILE, "utf8")).toContain(
      "Waiting for connections"
    );
  });

  it("reports SessionManagerPluginMissing and disconnects when the plugin isn't installed", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    const { databases, errors } = await freshDatabases();
    await connectSuccessfully(databases);

    sessionState.onOutput?.("SessionManagerPlugin is not found.\n");

    expect(databases.status()).toBe("disconnected");
    expect(errors.databaseConnectionErrors()[0]?.key).toBe(
      "SESSION_MANAGER_PLUGIN_MISSING"
    );
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

    const actual = await databases.disconnect();

    expect(actual).toBe("disconnected");
    expect(awsState.stopPortForward).toHaveBeenCalledOnce();
  });

  it("is safe to call while already disconnected", async () => {
    const { databases } = await freshDatabases();

    const actual = await databases.disconnect();

    expect(actual).toBe("disconnected");
  });
});

describe("copying the password writes the secret to the clipboard, never returning it", () => {
  it("writes the resolved password and resolves true", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.getSecretValue.mockResolvedValue({
      password: "s3cr3t",
      found: true,
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
    awsState.getSecretValue.mockResolvedValue({ password: null, found: false });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.copyPasswordToClipboard(
      "TEAM_MEMBER",
      "dev"
    );

    expect(actual).toBe(false);
    expect(errors.databaseConnectionErrors()[0]?.key).toBe("AWS_CLI_MISSING");
  });

  it("resolves false without reporting an error when the secret lookup fails for another reason", async () => {
    writeConfigFile(CONFIG_FIXTURE);
    awsState.getSecretValue.mockResolvedValue({ password: null, found: true });
    const { databases, errors } = await freshDatabases();

    const actual = await databases.copyPasswordToClipboard(
      "TEAM_MEMBER",
      "dev"
    );

    expect(actual).toBe(false);
    expect(errors.databaseConnectionErrors()).toEqual([]);
  });
});

describe("the selected database and environment are read through settings", () => {
  it("writes through updateSelectedDatabase/updateSelectedEnvironment and reads them back", async () => {
    const { databases } = await freshDatabases();

    await databases.updateSelectedDatabase("TEAM_MEMBER");
    await databases.updateSelectedEnvironment("dev");

    expect(databases.selectedDatabase()).toBe("TEAM_MEMBER");
    expect(databases.selectedEnvironment()).toBe("dev");
  });
});
