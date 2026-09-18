import { type ChildProcess, execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import {
  AWS_COMMAND,
  BASTION_ENV_VAR,
  NOT_FOUND_CODE,
  SHUTDOWN_GRACE_MS,
  SSM_DOCUMENT_NAME,
} from "@/main/services/aws/aws.constants";
import {
  type AwsExecResult,
  type ExecFailure,
  type PortForwardParams,
  type PortForwardStartResult,
  type SecretResult,
} from "@/main/services/aws/aws.types";

const run = promisify(execFile);
const WINDOWS = "win32";

/** Runs one aws CLI command and returns its output. */
async function runAws(args: string[]): Promise<AwsExecResult> {
  try {
    const result = await run(AWS_COMMAND, args);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      found: true,
      succeeded: true,
    };
  } catch (failure) {
    const exit = failure as ExecFailure;
    if (exit.code === NOT_FOUND_CODE) {
      return { stdout: "", stderr: "", found: false, succeeded: false };
    }
    return {
      stdout: exit.stdout ?? "",
      stderr: exit.stderr ?? "",
      found: true,
      succeeded: false,
    };
  }
}

/** Whether the given profile's credentials are currently valid. */
export async function checkCredentials(
  profile: string
): Promise<AwsExecResult> {
  return runAws(["sts", "get-caller-identity", "--profile", profile]);
}

/** Runs the browser-based SSO login flow for one profile. */
export async function ssoLogin(profile: string): Promise<AwsExecResult> {
  return runAws(["sso", "login", "--profile", profile]);
}

/** Tries the bash script's known field names before falling back to the raw string. */
function extractPassword(rawSecretString: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawSecretString);
  } catch {
    return rawSecretString;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return rawSecretString;
  }
  const fields = parsed as Record<string, unknown>;
  for (const field of ["password", "Password", "DB_PASSWORD"]) {
    const value = fields[field];
    if (typeof value === "string" && value !== "") {
      return value;
    }
  }
  return rawSecretString;
}

/** Reads a secret's value from Secrets Manager. */
export async function getSecretValue(
  secretId: string,
  profile: string,
  region: string
): Promise<SecretResult> {
  const result = await runAws([
    "secretsmanager",
    "get-secret-value",
    "--secret-id",
    secretId,
    "--query",
    "SecretString",
    "--output",
    "text",
    "--region",
    region,
    "--profile",
    profile,
  ]);

  if (!result.found || !result.succeeded) {
    return {
      password: null,
      found: result.found,
      succeeded: result.succeeded,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  const raw = result.stdout.trim();
  return {
    password: raw === "" ? null : extractPassword(raw),
    found: true,
    succeeded: true,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Signals a process group, tolerating one that is already gone. */
function signalGroup(pid: number, signal: NodeJS.Signals): boolean {
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}

const sessions = new Map<string, ChildProcess>();

/**
 * Spawns `aws ssm start-session` for port forwarding, detached so the
 * session-manager-plugin child it spawns is killed along with it. Sets
 * `USE_BASTION`, matching the reference script's own env — the session
 * doesn't route through the bastion without it. Keyed by `id` (the database
 * name) since more than one session can be open at once.
 */
export function startPortForward(
  id: string,
  params: PortForwardParams,
  onOutput: (chunk: string) => void
): Promise<PortForwardStartResult> {
  if (sessions.has(id)) {
    return Promise.resolve({ started: false, found: true, error: null });
  }

  return new Promise(function spawnSession(resolve) {
    const child = spawn(
      AWS_COMMAND,
      [
        "ssm",
        "start-session",
        "--target",
        params.target,
        "--document-name",
        SSM_DOCUMENT_NAME,
        "--parameters",
        `host=${params.host},portNumber=${params.port},localPortNumber=${params.localPort}`,
        "--profile",
        params.profile,
      ],
      {
        env: { ...process.env, [BASTION_ENV_VAR]: "1" },
        detached: process.platform !== WINDOWS,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    sessions.set(id, child);

    function captureOutput(chunk: Buffer): void {
      onOutput(chunk.toString("utf8"));
    }

    child.stdout?.on("data", captureOutput);
    child.stderr?.on("data", captureOutput);

    child.once("error", function failedToStart(error: NodeJS.ErrnoException) {
      sessions.delete(id);
      const found = error.code !== NOT_FOUND_CODE;
      resolve({ started: false, found, error: found ? error.message : null });
    });

    child.once("spawn", function started() {
      resolve({ started: true, found: true, error: null });
    });

    child.once("close", function stopped() {
      sessions.delete(id);
    });
  });
}

/** Kills one open session and everything it spawned. */
export function stopPortForward(id: string): Promise<void> {
  const stoppingProcess = sessions.get(id);
  if (stoppingProcess === undefined) {
    return Promise.resolve();
  }

  const pid = stoppingProcess.pid;

  if (pid === undefined) {
    return Promise.resolve();
  }

  return new Promise(function waitForExit(resolve) {
    stoppingProcess.once("close", function done() {
      resolve();
    });

    if (process.platform === WINDOWS) {
      execFile("taskkill", ["/pid", String(pid), "/t", "/f"]);
      return;
    }

    if (!signalGroup(pid, "SIGTERM")) {
      resolve();
      return;
    }

    setTimeout(function forceKill() {
      if (sessions.get(id) === stoppingProcess) {
        signalGroup(pid, "SIGKILL");
      }
    }, SHUTDOWN_GRACE_MS);
  });
}
