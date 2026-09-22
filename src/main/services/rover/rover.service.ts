import { type ChildProcess, execFile, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { promisify } from "node:util";

import { apollo } from "@/main/services/apollo/apollo.service";
import { environment } from "@/main/services/environment/environment.service";
import {
  addSupergraphError,
  clearSupergraphError,
} from "@/main/services/errors/errors.service";
import { findMatchingKeys } from "@/main/services/errors/errors.utils";
import {
  FEDERATION_VERSION,
  GENERATED_DIR,
  INSTALLED_PATH,
  NOT_FOUND_CODE,
  PATH_COMMAND,
  PORT_FREE_POLL_MS,
  PORT_FREE_TIMEOUT_MS,
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
import { LOCAL_HOST } from "@/shared/settings/settings.constants";
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
// reported the instant it appears; the state only becomes Running on rover's
// own ready line, with a silence timeout as a fallback if that line never
// comes — the process being alive is not the same as the graph being served.

const COMPOSING_MARKER = "composing supergraph";
const READY_MARKER = /supergraph is running/i;
const ASSUME_COMPOSED_AFTER_MS = 1000;

let attemptOutput = "";
let settleTimer: ReturnType<typeof setTimeout> | null = null;

/** Reports a failure the moment rover's output for this attempt shows one. */
function attemptFailed(): boolean {
  if (findMatchingKeys(attemptOutput).length === 0) {
    return false;
  }
  addSupergraphError([], attemptOutput);
  return true;
}

/** With no failure and nothing new to say, treats the attempt as composed. */
function assumeAttemptComposed(): void {
  if (attemptOutput.includes(COMPOSING_MARKER) && roverProcess !== null) {
    clearSupergraphError();
    state = SupergraphState.Running;
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
  if (READY_MARKER.test(chunk)) {
    assumeAttemptComposed();
    return;
  }
  settleTimer = setTimeout(assumeAttemptComposed, ASSUME_COMPOSED_AFTER_MS);
}

/** Resets the buffer for a fresh process's first attempt. */
function resetAttemptWatch(): void {
  attemptOutput = "";
  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
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

/** True once nothing answers on the port — the port itself, not any pid, is the source of truth. */
function isPortFree(port: number): Promise<boolean> {
  return new Promise(function check(resolve) {
    const probe = createServer();
    probe.once("error", function busy() {
      resolve(false);
    });
    probe.once("listening", function free() {
      probe.close(function closed() {
        resolve(true);
      });
    });
    probe.listen(port, LOCAL_HOST);
  });
}

/**
 * Rover's own exit does not mean the router it spawned has let go of the
 * port — that grandchild can outlive the group signal rover's pid answers
 * for. Polls the port itself, with a timeout, since a new rover dev needs it
 * free to bind.
 */
async function waitForPortFree(
  port: number,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortFree(port)) {
      return true;
    }
    await new Promise(function wait(resolve) {
      setTimeout(resolve, PORT_FREE_POLL_MS);
    });
  }
  return isPortFree(port);
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
): Promise<boolean> {
  if (roverProcess !== null) {
    return Promise.resolve(false);
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
      resolve(false);
    });

    child.once("spawn", function started() {
      resolve(true);
    });

    child.once("close", function stopped() {
      roverProcess = null;
      state = SupergraphState.Stopped;
    });
  });
}

/**
 * Kills rover and everything it spawned, and waits for the router port to
 * actually come free. Finishing on rover's exit alone can hand the next
 * start a port its predecessor's router is still sitting on.
 */
function stopRoverDev(): Promise<SupergraphState> {
  if (roverProcess === null) {
    state = SupergraphState.Stopped;
    return Promise.resolve(state);
  }

  const stoppingProcess = roverProcess;
  const maybePid = stoppingProcess.pid;

  if (maybePid === undefined) {
    return Promise.resolve(state);
  }

  const pid: number = maybePid;
  const routerPort = settings.read().routerPort;

  return new Promise(function waitForExit(resolve) {
    function resolveOncePortFree(): void {
      void waitForPortFree(routerPort, PORT_FREE_TIMEOUT_MS).then(
        function settled(freed) {
          if (!freed) {
            signalGroup(pid, "SIGKILL");
          }
          resolve(SupergraphState.Stopped);
        }
      );
    }

    stoppingProcess.once("close", resolveOncePortFree);

    if (process.platform === WINDOWS) {
      execFile("taskkill", ["/pid", String(pid), "/t", "/f"]);
      return;
    }

    if (!signalGroup(pid, "SIGTERM")) {
      resolveOncePortFree();
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

/** Writes both configs and spawns rover. Resolves once it has started, not once it has composed. */
async function startSupergraph(): Promise<SupergraphState> {
  const configFilePath = await writeCurrentConfig();
  const routerConfigFilePath = writeRouterConfigFile();
  resetAttemptWatch();

  await startRoverDev(
    configFilePath,
    routerConfigFilePath,
    settings.read().routerPort,
    ROVER_LOG_FILE
  );

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
 *
 * A rewrite-in-place without a restart was tried first: rover's own watch is
 * on the router config, not the supergraph one, and touching the router
 * config only reloads router-level settings — a subgraph's URL stays whatever
 * it was given at startup until the process restarts. Confirmed against a
 * real graph: the stale URL kept getting polled and its retries kept
 * exhausting after the override changed.
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
    return stopRoverDev();
  },

  status(): SupergraphState {
    return roverDevState();
  },
};
