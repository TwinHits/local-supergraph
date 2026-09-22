import { EventEmitter } from "node:events";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execState = vi.hoisted(() => ({
  stdout: "",
  stderr: "",
  error: null as
    (NodeJS.ErrnoException & { stdout?: string; stderr?: string }) | null,
  calls: [] as unknown[][],
}));

/** Stands in for a spawned child process: an EventEmitter with stdio streams. */
class FakeChildProcess extends EventEmitter {
  pid = 4242;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

let spawned: FakeChildProcess[] = [];
const spawnMock = vi.fn<(...args: unknown[]) => FakeChildProcess>(
  function fakeSpawn() {
    const child = new FakeChildProcess();
    spawned.push(child);
    return child;
  }
);

vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");

  function execFile(..._args: unknown[]): void {
    execState.calls.push(_args);
  }
  // execFile's real promisified shape resolves { stdout, stderr }, not the
  // array generic promisify would give a plain multi-arg callback.
  (execFile as unknown as Record<symbol, unknown>)[promisify.custom] =
    function customExecFile(...args: unknown[]) {
      execState.calls.push(args);
      if (execState.error !== null) {
        return Promise.reject(execState.error);
      }
      return Promise.resolve({
        stdout: execState.stdout,
        stderr: execState.stderr,
      });
    };

  const spawn = (...args: unknown[]) => spawnMock(...args);
  return { execFile, spawn, default: { execFile, spawn } };
});

/** The most recently spawned fake process. */
function latestProcess(): FakeChildProcess {
  const process_ = spawned[spawned.length - 1];
  if (process_ === undefined) {
    throw new Error("nothing has spawned yet");
  }
  return process_;
}

beforeEach(function isolate() {
  vi.resetModules();
  execState.stdout = "";
  execState.stderr = "";
  execState.error = null;
  execState.calls = [];
  spawned = [];
  spawnMock.mockClear();
  vi.spyOn(process, "kill").mockImplementation(function fakeKill() {
    return true;
  });
});

afterEach(function restoreMocks() {
  vi.restoreAllMocks();
});

async function freshAws() {
  return import("@/main/services/aws/aws.service");
}

describe("checking credentials distinguishes a missing aws CLI from stale credentials", () => {
  it("resolves found and succeeded when aws answers", async () => {
    execState.stdout = '{"Account":"123"}';
    const { checkCredentials } = await freshAws();

    const actual = await checkCredentials("omfsvcshubdev");

    expect(actual).toEqual({
      stdout: '{"Account":"123"}',
      stderr: "",
      found: true,
      succeeded: true,
    });
    expect(execState.calls[0]).toEqual([
      "aws",
      ["sts", "get-caller-identity", "--profile", "omfsvcshubdev"],
    ]);
  });

  it("resolves found: false when the aws binary itself is missing", async () => {
    const error = new Error("not found") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    execState.error = error;
    const { checkCredentials } = await freshAws();

    const actual = await checkCredentials("omfsvcshubdev");

    expect(actual).toEqual({
      stdout: "",
      stderr: "",
      found: false,
      succeeded: false,
    });
  });

  it("resolves found: true, succeeded: false when the session has expired", async () => {
    const error = new Error("exit 254") as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };
    error.stdout = "";
    error.stderr = "The SSO session has expired";
    execState.error = error;
    const { checkCredentials } = await freshAws();

    const actual = await checkCredentials("omfsvcshubdev");

    expect(actual).toEqual({
      stdout: "",
      stderr: "The SSO session has expired",
      found: true,
      succeeded: false,
    });
  });
});

describe("signing in through AWS SSO runs the browser-based device flow for one profile", () => {
  it("resolves found and succeeded once signed in", async () => {
    execState.stdout =
      "Successfully logged into Start URL: https://example.awsapps.com/start";
    const { ssoLogin } = await freshAws();

    const actual = await ssoLogin("omfsvcshubdev");

    expect(actual).toEqual({
      stdout:
        "Successfully logged into Start URL: https://example.awsapps.com/start",
      stderr: "",
      found: true,
      succeeded: true,
    });
    expect(execState.calls[0]).toEqual([
      "aws",
      ["sso", "login", "--profile", "omfsvcshubdev"],
    ]);
  });

  it("resolves found: false when the aws binary itself is missing", async () => {
    const error = new Error("not found") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    execState.error = error;
    const { ssoLogin } = await freshAws();

    const actual = await ssoLogin("omfsvcshubdev");

    expect(actual).toEqual({
      stdout: "",
      stderr: "",
      found: false,
      succeeded: false,
    });
  });

  it("resolves found: true, succeeded: false when the named profile isn't configured locally", async () => {
    const error = new Error("exit 255") as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };
    error.stdout = "";
    error.stderr = "The config profile (omfsvcshubdev) could not be found";
    execState.error = error;
    const { ssoLogin } = await freshAws();

    const actual = await ssoLogin("omfsvcshubdev");

    expect(actual).toEqual({
      stdout: "",
      stderr: "The config profile (omfsvcshubdev) could not be found",
      found: true,
      succeeded: false,
    });
  });
});

describe("reading a secret's value tries the bash script's known fields before falling back to the raw string", () => {
  it("extracts .password when present", async () => {
    execState.stdout = '{"password":"topsecret"}';
    const { getSecretValue } = await freshAws();

    const actual = await getSecretValue("secret-id", "profile", "us-east-1");

    expect(actual).toEqual({
      password: "topsecret",
      found: true,
      succeeded: true,
      stdout: '{"password":"topsecret"}',
      stderr: "",
    });
    expect(execState.calls[0]).toEqual([
      "aws",
      [
        "secretsmanager",
        "get-secret-value",
        "--secret-id",
        "secret-id",
        "--query",
        "SecretString",
        "--output",
        "text",
        "--region",
        "us-east-1",
        "--profile",
        "profile",
      ],
    ]);
  });

  it("extracts .Password when .password is absent", async () => {
    execState.stdout = '{"Password":"topsecret"}';
    const { getSecretValue } = await freshAws();

    const actual = await getSecretValue("secret-id", "profile", "us-east-1");

    expect(actual.password).toBe("topsecret");
  });

  it("extracts .DB_PASSWORD when neither password field is present", async () => {
    execState.stdout = '{"DB_PASSWORD":"topsecret"}';
    const { getSecretValue } = await freshAws();

    const actual = await getSecretValue("secret-id", "profile", "us-east-1");

    expect(actual.password).toBe("topsecret");
  });

  it("falls back to the raw string when the secret isn't JSON", async () => {
    execState.stdout = "plain-text-password";
    const { getSecretValue } = await freshAws();

    const actual = await getSecretValue("secret-id", "profile", "us-east-1");

    expect(actual.password).toBe("plain-text-password");
  });

  it("resolves found: false when aws is missing, without a password", async () => {
    const error = new Error("not found") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    execState.error = error;
    const { getSecretValue } = await freshAws();

    const actual = await getSecretValue("secret-id", "profile", "us-east-1");

    expect(actual).toEqual({
      password: null,
      found: false,
      succeeded: false,
      stdout: "",
      stderr: "",
    });
  });

  it("resolves password: null when the call fails for another reason", async () => {
    execState.error = new Error("access denied") as NodeJS.ErrnoException;
    const { getSecretValue } = await freshAws();

    const actual = await getSecretValue("secret-id", "profile", "us-east-1");

    expect(actual).toEqual({
      password: null,
      found: true,
      succeeded: false,
      stdout: "",
      stderr: "",
    });
  });

  it("resolves password: null when the secret string is empty", async () => {
    execState.stdout = "";
    const { getSecretValue } = await freshAws();

    const actual = await getSecretValue("secret-id", "profile", "us-east-1");

    expect(actual).toEqual({
      password: null,
      found: true,
      succeeded: true,
      stdout: "",
      stderr: "",
    });
  });
});

describe("starting a port-forwarding session spawns aws ssm with the bastion env the script relies on", () => {
  it("spawns with USE_BASTION=1 and the expected parameters", async () => {
    const { startPortForward } = await freshAws();

    const starting = startPortForward(
      "TEAM_MEMBER",
      {
        target: "i-0123",
        host: "db.example.com",
        port: 5432,
        localPort: 5432,
        profile: "omfsvcshubdev",
      },
      function onOutput() {}
    );
    latestProcess().emit("spawn");
    const actual = await starting;

    expect(actual).toEqual({ started: true, found: true, error: null });
    expect(spawnMock).toHaveBeenCalledOnce();
    const [command, args, options] = spawnMock.mock.calls[0] as [
      string,
      string[],
      { env: Record<string, string | undefined> },
    ];
    expect(command).toBe("aws");
    expect(args).toEqual([
      "ssm",
      "start-session",
      "--target",
      "i-0123",
      "--document-name",
      "AWS-StartPortForwardingSessionToRemoteHost",
      "--parameters",
      "host=db.example.com,portNumber=5432,localPortNumber=5432",
      "--profile",
      "omfsvcshubdev",
    ]);
    expect(options.env.USE_BASTION).toBe("1");
  });

  it("streams stdout and stderr chunks to onOutput", async () => {
    const { startPortForward } = await freshAws();
    const chunks: string[] = [];

    const starting = startPortForward(
      "TEAM_MEMBER",
      {
        target: "i-0123",
        host: "db.example.com",
        port: 5432,
        localPort: 5432,
        profile: "omfsvcshubdev",
      },
      function onOutput(chunk) {
        chunks.push(chunk);
      }
    );
    const child = latestProcess();
    child.emit("spawn");
    await starting;

    child.stdout.emit("data", Buffer.from("Waiting for connections...\n"));
    child.stderr.emit("data", Buffer.from("a warning\n"));

    expect(chunks).toEqual(["Waiting for connections...\n", "a warning\n"]);
  });

  it("resolves found: false when aws itself is missing", async () => {
    const { startPortForward } = await freshAws();

    const starting = startPortForward(
      "TEAM_MEMBER",
      {
        target: "i-0123",
        host: "db.example.com",
        port: 5432,
        localPort: 5432,
        profile: "omfsvcshubdev",
      },
      function onOutput() {}
    );
    const error = new Error("not found") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    latestProcess().emit("error", error);
    const actual = await starting;

    expect(actual).toEqual({ started: false, found: false, error: null });
  });

  it("resolves started: false with the error message when spawning fails for another reason", async () => {
    const { startPortForward } = await freshAws();

    const starting = startPortForward(
      "TEAM_MEMBER",
      {
        target: "i-0123",
        host: "db.example.com",
        port: 5432,
        localPort: 5432,
        profile: "omfsvcshubdev",
      },
      function onOutput() {}
    );
    latestProcess().emit("error", new Error("EACCES"));
    const actual = await starting;

    expect(actual).toEqual({ started: false, found: true, error: "EACCES" });
  });

  it("is a no-op for the same id while a session is already open", async () => {
    const { startPortForward } = await freshAws();
    const params = {
      target: "i-0123",
      host: "db.example.com",
      port: 5432,
      localPort: 5432,
      profile: "omfsvcshubdev",
    };
    const first = startPortForward(
      "TEAM_MEMBER",
      params,
      function onOutput() {}
    );
    latestProcess().emit("spawn");
    await first;

    const second = await startPortForward(
      "TEAM_MEMBER",
      params,
      function onOutput() {}
    );

    expect(second).toEqual({ started: false, found: true, error: null });
    expect(spawnMock).toHaveBeenCalledOnce();
  });
});

describe("stopping kills the open session and everything it spawned", () => {
  it("resolves immediately when nothing is running", async () => {
    const { stopPortForward } = await freshAws();

    await expect(stopPortForward("TEAM_MEMBER")).resolves.toBeUndefined();
    expect(process.kill).not.toHaveBeenCalled();
  });

  it("signals the process and resolves once it closes", async () => {
    const { startPortForward, stopPortForward } = await freshAws();
    const starting = startPortForward(
      "TEAM_MEMBER",
      {
        target: "i-0123",
        host: "db.example.com",
        port: 5432,
        localPort: 5432,
        profile: "omfsvcshubdev",
      },
      function onOutput() {}
    );
    const child = latestProcess();
    child.emit("spawn");
    await starting;

    const stopping = stopPortForward("TEAM_MEMBER");
    child.emit("close");
    await stopping;

    expect(process.kill).toHaveBeenCalledWith(-4242, "SIGTERM");
  });

  it("force-kills after the grace period if SIGTERM doesn't finish the job", async () => {
    vi.useFakeTimers();
    const { startPortForward, stopPortForward } = await freshAws();
    const starting = startPortForward(
      "TEAM_MEMBER",
      {
        target: "i-0123",
        host: "db.example.com",
        port: 5432,
        localPort: 5432,
        profile: "omfsvcshubdev",
      },
      function onOutput() {}
    );
    latestProcess().emit("spawn");
    await starting;

    const stopping = stopPortForward("TEAM_MEMBER");
    await vi.advanceTimersByTimeAsync(5000);
    latestProcess().emit("close");
    await stopping;

    expect(process.kill).toHaveBeenCalledWith(-4242, "SIGTERM");
    expect(process.kill).toHaveBeenCalledWith(-4242, "SIGKILL");
    vi.useRealTimers();
  });
});
