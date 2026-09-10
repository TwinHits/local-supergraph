import { apollo } from "@/main/services/apollo/apollo.service";
import {
  clearSupergraphFailure,
  reportSupergraphFailure,
} from "@/main/services/errors/errors.service";
import { findMatchingKeys } from "@/main/services/errors/errors.utils";
import {
  onRoverOutput,
  roverDevState,
  startRoverDev,
  stopRoverDev,
} from "@/main/services/rover/rover.service";
import { settings } from "@/main/services/settings/settings.service";
import { subgraphOverrides } from "@/main/services/subgraph-overrides/subgraph-overrides.service";
import { ROVER_LOG_FILE } from "@/main/services/supergraph-config/supergraph-config.constants";
import { writeSupergraphConfig } from "@/main/services/supergraph-config/supergraph-config.service";
import { type Awaitable } from "@/shared/contract/contract.types";
import {
  type DisabledSubgraphs,
  type Override,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";
import { type SupergraphContract } from "@/shared/supergraph/supergraph.contract";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

const COMPOSING_MARKER = "composing supergraph";
// A large graph can go quiet for a while mid-compose, so this only fires once
// nothing has been said for a while — long enough that it means "done", not
// "still working".
const ASSUME_COMPOSED_AFTER_MS = 1000;
const MAX_WAIT_FOR_FIRST_ATTEMPT_MS = 60000;

let attemptOutput = "";
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let resolveFirstAttempt: (() => void) | null = null;

/** Unblocks start()'s wait for the first composition attempt, once. */
function settleFirstAttempt(): void {
  if (resolveFirstAttempt !== null) {
    resolveFirstAttempt();
    resolveFirstAttempt = null;
  }
}

/** Reports a failure the moment rover's output for this attempt shows one. */
function checkForFailure(): boolean {
  if (findMatchingKeys(attemptOutput).length === 0) {
    return false;
  }
  reportSupergraphFailure([], attemptOutput);
  settleFirstAttempt();
  return true;
}

/** With no failure and nothing new to say, treats the attempt as composed. */
function assumeComposed(): void {
  if (attemptOutput.includes(COMPOSING_MARKER)) {
    clearSupergraphFailure();
    settleFirstAttempt();
  }
}

/**
 * Collects rover's output one composition attempt at a time. Rover recomposes
 * on every hot reload, so a fresh "composing supergraph" line starts a new
 * attempt rather than being appended to the last one.
 */
function watchComposition(chunk: string): void {
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

  if (checkForFailure()) {
    return;
  }

  settleTimer = setTimeout(assumeComposed, ASSUME_COMPOSED_AFTER_MS);
}

onRoverOutput(watchComposition);

/** Writes the current variant's config from its latest subgraphs and choices. */
async function writeCurrentConfig(): Promise<string> {
  const variant = settings.currentVariant();
  const subgraphs = await apollo.listSubgraphs();
  return writeSupergraphConfig(
    variant,
    subgraphs,
    subgraphOverrides.overrides(),
    subgraphOverrides.disabledSubgraphs()
  );
}

/** Writes the config and spawns rover, waiting for its first composition attempt. */
async function startSupergraph(): Promise<SupergraphState> {
  attemptOutput = "";
  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }

  const configFilePath = await writeCurrentConfig();

  const firstAttempt = new Promise<void>(function wait(resolve) {
    resolveFirstAttempt = resolve;
  });
  const giveUpWaiting = setTimeout(
    settleFirstAttempt,
    MAX_WAIT_FOR_FIRST_ATTEMPT_MS
  );

  const spawned = await startRoverDev(
    configFilePath,
    settings.read().routerPort,
    ROVER_LOG_FILE
  );

  if (spawned !== SupergraphState.Running) {
    clearTimeout(giveUpWaiting);
    resolveFirstAttempt = null;
    return spawned;
  }

  await firstAttempt;
  clearTimeout(giveUpWaiting);
  return roverDevState();
}

let restarting = false;
let restartQueued = false;

/**
 * Restarts rover on its latest config if it's up. rover only reads
 * --supergraph-config once at launch — confirmed it does not watch the file
 * — so picking up an override or enabled change means a real restart, not a
 * rewrite. Queues at most one more restart if changes land while one is
 * already in flight, so a rapid run of toggles doesn't drop the last one.
 */
async function recomposeIfRunning(): Promise<void> {
  if (restarting) {
    restartQueued = true;
    return;
  }
  if (roverDevState() === SupergraphState.Stopped) {
    return;
  }

  restarting = true;
  do {
    restartQueued = false;
    settleFirstAttempt();
    await stopRoverDev();
    await startSupergraph();
  } while (restartQueued);
  restarting = false;
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
  const next = subgraphOverrides.updateOverride(name, override);
  void recomposeIfRunning();
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
  const next = subgraphOverrides.setSubgraphEnabled(name, enabled);
  void recomposeIfRunning();
  return next;
}

export const supergraph: Awaitable<SupergraphContract> = {
  async start(): Promise<SupergraphState> {
    if (roverDevState() !== SupergraphState.Stopped) {
      return roverDevState();
    }
    return startSupergraph();
  },

  async stop(): Promise<SupergraphState> {
    settleFirstAttempt();
    return stopRoverDev();
  },

  status(): SupergraphState {
    return roverDevState();
  },
};
