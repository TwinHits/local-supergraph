import { type ChildProcess, execFile, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

import { apollo } from "@/main/services/apollo/apollo.service";
import { environment } from "@/main/services/environment/environment.service";
import {
  clearSupergraphFailure,
  reportSupergraphFailure,
} from "@/main/services/errors/errors.service";
import { findMatchingKeys } from "@/main/services/errors/errors.utils";
import {
  FEDERATION_VERSION,
  GENERATED_DIR,
  INSTALLED_PATH,
  NOT_FOUND_CODE,
  PATH_COMMAND,
  ROUTER_CONFIG_FILE,
  ROVER_LOG_FILE,
  SHUTDOWN_GRACE_MS,
} from "@/main/services/rover/rover.constants";
import {
  type ConfigEntry,
  type ExecFailure,
  type RoverResult,
} from "@/main/services/rover/rover.types";
import {
  currentDisabledSubgraphs,
  currentOverrides,
  setSubgraphEnabled as persistSubgraphEnabled,
  settings,
  updateCurrentOverride as persistOverride,
} from "@/main/services/settings/settings.service";
import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import { type Awaitable } from "@/shared/contract/contract.types";
import {
  type DisabledSubgraphs,
  type Override,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";
import { type SupergraphContract } from "@/shared/supergraph/supergraph.contract";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

const run = promisify(execFile);
const WINDOWS = "win32";

let roverProcess: ChildProcess | null = null;
let state: SupergraphState = SupergraphState.Stopped;

/**
 * Looks in rover's install path first, because its installer only updates PATH
 * for shells opened afterward.
 */
function findRover(): string {
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
function roverDevState(): SupergraphState {
  return state;
}

// --- Composition-attempt watching -----------------------------------------
//
// Rover recomposes on every hot reload, so its output is collected one
// composition attempt at a time: a fresh "composing supergraph" line starts
// a new attempt rather than being appended to the last one. A failure is
// reported the instant it appears; with no failure and nothing new to say
// for a while, the attempt is treated as composed.

const COMPOSING_MARKER = "composing supergraph";
// A large graph can go quiet for a while mid-compose, so this only fires once
// nothing has been said for a while — long enough that it means "done", not
// "still working".
const ASSUME_COMPOSED_AFTER_MS = 1000;

let attemptOutput = "";
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let onAttemptSettled: (() => void) | null = null;

/** Unblocks whatever is waiting on the current attempt, once. */
function settleAttempt(): void {
  if (onAttemptSettled !== null) {
    const notify = onAttemptSettled;
    onAttemptSettled = null;
    notify();
  }
}

/** Reports a failure the moment rover's output for this attempt shows one. */
function attemptFailed(): boolean {
  if (findMatchingKeys(attemptOutput).length === 0) {
    return false;
  }
  reportSupergraphFailure([], attemptOutput);
  settleAttempt();
  return true;
}

/** With no failure and nothing new to say, treats the attempt as composed. */
function assumeAttemptComposed(): void {
  if (attemptOutput.includes(COMPOSING_MARKER)) {
    clearSupergraphFailure();
    settleAttempt();
  }
}

function watchOutput(chunk: string): void {
  const isNewAttempt =
    chunk.includes(COMPOSING_MARKER) &&
    attemptOutput.includes(COMPOSING_MARKER);
  attemptOutput = isNewAttempt
    ? chunk.slice(chunk.indexOf(COMPOSING_MARKER))
    : attemptOutput + chunk;

  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  if (attemptFailed()) {
    return;
  }
  settleTimer = setTimeout(assumeAttemptComposed, ASSUME_COMPOSED_AFTER_MS);
}

/** Resets the buffer for a fresh process and waits for its first attempt to settle. */
function watchNextAttempt(): Promise<void> {
  attemptOutput = "";
  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  return new Promise(function wait(resolve) {
    onAttemptSettled = resolve;
  });
}

/** Unblocks a pending watch immediately — used when stopping mid-attempt. */
function stopWatching(): void {
  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  settleAttempt();
}

// --- Generated config files -------------------------------------------------

function supergraphConfigFilePath(variant: string): string {
  return `${GENERATED_DIR}/supergraph.${variant}.yaml`;
}

/**
 * Every subgraph rover should compose: its local URL where the developer
 * switched it local, its registry URL otherwise. Disabled subgraphs are left
 * out entirely — they never reach rover, so they can't fail composition.
 */
function buildConfigEntries(
  subgraphs: RegisteredSubgraph[],
  overrides: OverrideMap,
  disabled: DisabledSubgraphs
): ConfigEntry[] {
  const entries: ConfigEntry[] = [];
  for (const subgraph of subgraphs) {
    if (disabled.includes(subgraph.name)) {
      continue;
    }
    const override = overrides[subgraph.name];
    const url =
      override !== undefined && override.local && override.port !== null
        ? `http://${settings.localAddress(override.port)}`
        : subgraph.routingUrl;
    entries.push({ name: subgraph.name, url });
  }
  return entries;
}

/** Renders config entries as the YAML rover dev reads to compose the graph. */
function renderSupergraphYaml(entries: ConfigEntry[]): string {
  const header = `federation_version: ${JSON.stringify(FEDERATION_VERSION)}\n`;
  if (entries.length === 0) {
    return `${header}subgraphs: {}\n`;
  }
  const body = entries
    .map(function entryLines(entry) {
      const url = JSON.stringify(entry.url);
      return `  ${entry.name}:\n    routing_url: ${url}\n    schema:\n      subgraph_url: ${url}`;
    })
    .join("\n");
  return `${header}subgraphs:\n${body}\n`;
}

/** Writes the variant's full subgraph config and returns the file rover reads. */
function writeSupergraphConfigFile(
  variant: string,
  subgraphs: RegisteredSubgraph[],
  overrides: OverrideMap,
  disabled: DisabledSubgraphs
): string {
  mkdirSync(GENERATED_DIR, { recursive: true });
  const path = supergraphConfigFilePath(variant);
  writeFileSync(
    path,
    renderSupergraphYaml(buildConfigEntries(subgraphs, overrides, disabled))
  );
  return path;
}

/** Renders the router configuration as the YAML rover dev reads for the router. */
function renderRouterYaml(): string {
  return [
    "sandbox:",
    "  enabled: true",
    "homepage:",
    "  enabled: false",
    "supergraph:",
    "  introspection: true",
    "include_subgraph_errors:",
    "  all: true",
    "plugins:",
    "  experimental.expose_query_plan: true",
    "headers:",
    "  all:",
    "    request:",
    "      - propagate:",
    "          matching: .*",
    "telemetry:",
    "  instrumentation:",
    "    spans:",
    "      mode: spec_compliant",
    "authorization:",
    "  directives:",
    "    enabled: false",
    "",
  ].join("\n");
}

/** Writes the router configuration and returns the file rover reads. */
function writeRouterConfigFile(): string {
  mkdirSync(GENERATED_DIR, { recursive: true });
  writeFileSync(ROUTER_CONFIG_FILE, renderRouterYaml());
  return ROUTER_CONFIG_FILE;
}

/** Writes the current variant's config from its latest subgraphs and choices. */
async function writeCurrentConfig(): Promise<string> {
  const variant = settings.currentVariant();
  const subgraphs = await apollo.listSubgraphs();
  return writeSupergraphConfigFile(
    variant,
    subgraphs,
    currentOverrides(),
    currentDisabledSubgraphs()
  );
}

// --- Spawning and killing rover dev -----------------------------------------

/**
 * Signals a process group, tolerating one that is already gone. rover can
 * exit on its own in the instant before this runs — Node hasn't delivered
 * that process's "close" event yet, so the stale pid still looks live — and
 * signalling a dead pid throws ESRCH.
 */
function signalGroup(pid: number, signal: NodeJS.Signals): boolean {
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}

/**
 * Spawns rover dev and resolves once it has either started or failed to start.
 * Runs detached so the router it launches can be killed along with it —
 * killing rover alone would leave the router running and still bound to the
 * port.
 */
function startRoverDev(
  configFilePath: string,
  routerConfigFilePath: string,
  routerPort: number,
  logFilePath: string
): Promise<SupergraphState> {
  if (roverProcess !== null) {
    return Promise.resolve(state);
  }

  state = SupergraphState.Starting;

  return new Promise(function spawnRover(resolve) {
    writeFileSync(logFilePath, "");

    const child = spawn(
      findRover(),
      [
        "dev",
        "--supergraph-config",
        configFilePath,
        "--router-config",
        routerConfigFilePath,
        "--supergraph-port",
        String(routerPort),
        "--graph-ref",
        `${environment.graphName()}@${settings.currentVariant()}`,
      ],
      {
        env: environment.childEnv(),
        detached: process.platform !== WINDOWS,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    roverProcess = child;

    function captureOutput(chunk: Buffer): void {
      const text = chunk.toString("utf8");
      appendFileSync(logFilePath, text);
      watchOutput(text);
    }

    child.stdout?.on("data", captureOutput);
    child.stderr?.on("data", captureOutput);

    child.once("error", function failedToStart() {
      roverProcess = null;
      state = SupergraphState.Stopped;
      resolve(state);
    });

    child.once("spawn", function started() {
      state = SupergraphState.Running;
      resolve(state);
    });

    child.once("close", function stopped() {
      roverProcess = null;
      state = SupergraphState.Stopped;
    });
  });
}

/** Kills rover and everything it spawned, and waits for it to fully exit. */
function stopRoverDev(): Promise<SupergraphState> {
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
    stoppingProcess.once("close", function stopped() {
      resolve(SupergraphState.Stopped);
    });

    if (process.platform === WINDOWS) {
      execFile("taskkill", ["/pid", String(pid), "/t", "/f"]);
      return;
    }

    if (!signalGroup(pid, "SIGTERM")) {
      resolve(SupergraphState.Stopped);
      return;
    }

    setTimeout(function forceKill() {
      if (roverProcess === stoppingProcess) {
        signalGroup(pid, "SIGKILL");
      }
    }, SHUTDOWN_GRACE_MS);
  });
}

// --- Starting, stopping, and restarting on change ---------------------------

const MAX_WAIT_FOR_FIRST_ATTEMPT_MS = 60000;

/** Writes both configs and spawns rover, waiting for its first composition attempt. */
async function startSupergraph(): Promise<SupergraphState> {
  const configFilePath = await writeCurrentConfig();
  const routerConfigFilePath = writeRouterConfigFile();

  const attempt = watchNextAttempt();
  const giveUpWaiting = setTimeout(stopWatching, MAX_WAIT_FOR_FIRST_ATTEMPT_MS);

  const spawned = await startRoverDev(
    configFilePath,
    routerConfigFilePath,
    settings.read().routerPort,
    ROVER_LOG_FILE
  );

  if (spawned !== SupergraphState.Running) {
    clearTimeout(giveUpWaiting);
    stopWatching();
    return spawned;
  }

  await attempt;
  clearTimeout(giveUpWaiting);
  return roverDevState();
}

// A single queue: start and restart-on-change never run concurrently, since
// they both spawn a process and both drive the same composition watch.
// Without this, a toggle that lands while the first Start is still composing
// would race it — both resetting the same watch, both spawning. stop() stays
// outside the queue so cancelling mid-compose still works immediately.
let queue: Promise<SupergraphState> = Promise.resolve(SupergraphState.Stopped);

function enqueueSpawn(
  operation: () => Promise<SupergraphState>
): Promise<SupergraphState> {
  queue = queue.then(operation, operation);
  return queue;
}

let restartQueued = false;

/**
 * Restarts rover on its latest config, if it's up. Coalesces a rapid run of
 * changes into one restart that picks up the latest state, rather than
 * running once per change.
 */
function recomposeIfRunning(): void {
  if (restartQueued) {
    return;
  }
  restartQueued = true;
  void enqueueSpawn(async function restart() {
    restartQueued = false;
    if (roverDevState() === SupergraphState.Stopped) {
      return roverDevState();
    }
    stopWatching();
    await stopRoverDev();
    return startSupergraph();
  });
}

/**
 * Changes a subgraph's local/remote override and restarts rover if it's
 * running. Resolves as soon as the choice is saved — the restart, if any,
 * keeps going in the background so the toggle itself doesn't wait on it.
 */
export async function updateOverride(
  name: string,
  override: Override
): Promise<OverrideMap> {
  const next = persistOverride(name, override);
  recomposeIfRunning();
  return next;
}

/**
 * Enables or disables a subgraph and restarts rover if it's running.
 * Resolves as soon as the choice is saved, same as updateOverride.
 */
export async function setSubgraphEnabled(
  name: string,
  enabled: boolean
): Promise<DisabledSubgraphs> {
  const next = persistSubgraphEnabled(name, enabled);
  recomposeIfRunning();
  return next;
}

export const supergraph: Awaitable<SupergraphContract> = {
  async start(): Promise<SupergraphState> {
    return enqueueSpawn(async function begin() {
      if (roverDevState() !== SupergraphState.Stopped) {
        return roverDevState();
      }
      return startSupergraph();
    });
  },

  async stop(): Promise<SupergraphState> {
    stopWatching();
    return stopRoverDev();
  },

  status(): SupergraphState {
    return roverDevState();
  },
};
