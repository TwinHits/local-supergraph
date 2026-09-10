import { type ChildProcess, execFile, spawn } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import { promisify } from "node:util";

import { environment } from "@/main/services/environment/environment.service";
import {
  INSTALLED_PATH,
  NOT_FOUND_CODE,
  PATH_COMMAND,
  SHUTDOWN_GRACE_MS,
} from "@/main/services/rover/rover.constants";
import {
  type ExecFailure,
  type RoverResult,
} from "@/main/services/rover/rover.types";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

const run = promisify(execFile);
const WINDOWS = "win32";

let roverProcess: ChildProcess | null = null;
let state: SupergraphState = SupergraphState.Stopped;

/**
 * Looks in rover's install path first, because its installer only updates PATH
 * for shells opened afterward.
 */
export function findRover(): string {
  for (const candidate of [INSTALLED_PATH, `${INSTALLED_PATH}.exe`]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return PATH_COMMAND;
}

/** Runs rover and returns its output. */
export async function runRover(args: string[]): Promise<RoverResult> {
  try {
    const result = await run(findRover(), args, {
      env: environment.childEnv(),
    });
    return { stdout: result.stdout, stderr: result.stderr, found: true };
  } catch (failure) {
    const exit = failure as ExecFailure;
    if (exit.code === NOT_FOUND_CODE) {
      return { stdout: "", stderr: "", found: false };
    }
    return {
      stdout: exit.stdout ?? "",
      stderr: exit.stderr ?? "",
      found: true,
    };
  }
}

/** Whether rover is stopped, starting, or running. */
export function roverDevState(): SupergraphState {
  return state;
}

/**
 * Spawns rover dev and resolves once it has either started or failed to start.
 * Runs detached so the router it launches can be killed along with it —
 * killing rover alone would leave the router running and still bound to the
 * port.
 */
export function startRoverDev(
  graphRef: string,
  configFilePath: string,
  routerPort: number,
  logFilePath: string
): Promise<SupergraphState> {
  if (roverProcess !== null) {
    return Promise.resolve(state);
  }

  state = SupergraphState.Starting;

  return new Promise(function spawnRover(resolve) {
    // An unread pipe fills up and rover blocks on write before the router
    // ever comes up, so its output goes to a file instead.
    const log = openSync(logFilePath, "w");

    const child = spawn(
      findRover(),
      [
        "dev",
        "--graph-ref",
        graphRef,
        "--supergraph-config",
        configFilePath,
        "--supergraph-port",
        String(routerPort),
      ],
      {
        env: environment.childEnv(),
        detached: process.platform !== WINDOWS,
        stdio: ["ignore", log, log],
      }
    );

    closeSync(log);
    roverProcess = child;

    child.once("error", function failedToStart() {
      roverProcess = null;
      state = SupergraphState.Stopped;
      resolve(state);
    });

    child.once("spawn", function started() {
      state = SupergraphState.Running;
      resolve(state);
    });

    child.once("exit", function stopped() {
      roverProcess = null;
      state = SupergraphState.Stopped;
    });
  });
}

/** Kills rover and everything it spawned, and waits for it to exit. */
export function stopRoverDev(): Promise<SupergraphState> {
  if (roverProcess === null) {
    state = SupergraphState.Stopped;
    return Promise.resolve(state);
  }

  const stoppingProcess = roverProcess;
  const pid = stoppingProcess.pid;

  if (pid === undefined) {
    return Promise.resolve(state);
  }

  return new Promise(function waitForExit(resolve) {
    stoppingProcess.once("exit", function stopped() {
      resolve(SupergraphState.Stopped);
    });

    if (process.platform === WINDOWS) {
      execFile("taskkill", ["/pid", String(pid), "/t", "/f"]);
      return;
    }

    process.kill(-pid, "SIGTERM");
    setTimeout(function forceKill() {
      if (roverProcess === stoppingProcess) {
        process.kill(-pid, "SIGKILL");
      }
    }, SHUTDOWN_GRACE_MS);
  });
}
