import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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

const GENERATED_DIR = mkdtempSync(join(tmpdir(), "local-supergraph-rover-"));

vi.mock("@/main/services/rover/rover.constants", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/main/services/rover/rover.constants")
    >();
  return {
    ...actual,
    GENERATED_DIR,
    ROVER_LOG_FILE: join(GENERATED_DIR, "rover.log"),
    ROUTER_CONFIG_FILE: join(GENERATED_DIR, "router.yaml"),
  };
});

vi.mock("@/main/services/environment/environment.service", () => ({
  environment: {
    childEnv: () => ({}),
    graphName: () => "local-supergraph",
  },
}));

vi.mock("@/main/services/apollo/apollo.service", () => ({
  apollo: {
    listSubgraphs: () =>
      Promise.resolve([
        { name: "characters", routingUrl: "https://characters.svc/graphql" },
        { name: "starships", routingUrl: "https://starships.svc/graphql" },
      ]),
  },
}));

// vi.resetModules() does not reliably re-run this factory between tests, so
// the mock's state is held outside the module cache and reset explicitly in
// beforeEach instead of relying on module isolation.
const settingsState = vi.hoisted(() => ({
  overrides: {} as Record<string, { local: boolean; port: number | null }>,
  disabled: [] as string[],
}));

vi.mock("@/main/services/settings/settings.service", () => ({
  settings: {
    currentVariant: () => "current",
    read: () => ({ routerPort: 4041 }),
    localAddress: (port: number | null) =>
      port === null ? "localhost:" : `localhost:${port}`,
  },
  currentOverrides: () => settingsState.overrides,
  updateCurrentOverride: (
    name: string,
    override: { local: boolean; port: number | null }
  ) => {
    settingsState.overrides = { ...settingsState.overrides, [name]: override };
    return settingsState.overrides;
  },
  currentDisabledSubgraphs: () => settingsState.disabled,
  setSubgraphEnabled: (name: string, enabled: boolean) => {
    settingsState.disabled = enabled
      ? settingsState.disabled.filter(function isOther(each) {
          return each !== name;
        })
      : [...settingsState.disabled, name];
    return settingsState.disabled;
  },
}));

/** Stands in for a spawned rover process: an EventEmitter with stdio streams. */
class FakeRoverProcess extends EventEmitter {
  pid = 4242;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

let spawned: FakeRoverProcess[] = [];
const spawnMock = vi.fn<(...args: unknown[]) => FakeRoverProcess>(
  function fakeSpawn() {
    const child = new FakeRoverProcess();
    spawned.push(child);
    queueMicrotask(function emitSpawn() {
      child.emit("spawn");
    });
    return child;
  }
);

vi.mock("node:child_process", () => {
  const spawn = (...args: unknown[]) => spawnMock(...args);
  const execFile = vi.fn();
  return { spawn, execFile, default: { spawn, execFile } };
});

// Held busy for a number of checks, then free — so a test can simulate a
// router that outlives the group signal for a while before it lets go.
const portState = vi.hoisted(() => ({ busyChecksLeft: 0 }));

vi.mock("node:net", () => {
  function createServer() {
    const server = new EventEmitter() as EventEmitter & {
      listen: (port: number, host: string) => void;
      close: (onClosed: () => void) => void;
    };
    server.listen = function listen() {
      queueMicrotask(function respond() {
        if (portState.busyChecksLeft > 0) {
          portState.busyChecksLeft -= 1;
          server.emit("error", new Error("EADDRINUSE"));
        } else {
          server.emit("listening");
        }
      });
    };
    server.close = function close(onClosed) {
      onClosed();
    };
    return server;
  }
  return { createServer, default: { createServer } };
});

/** The most recently spawned fake process. */
function latestProcess(): FakeRoverProcess {
  const process_ = spawned[spawned.length - 1];
  if (process_ === undefined) {
    throw new Error("nothing has spawned yet");
  }
  return process_;
}

/** Waits for rover's process to actually spawn, then returns it. */
async function spawnedProcess(): Promise<FakeRoverProcess> {
  await vi.waitFor(function hasSpawned() {
    expect(spawnMock).toHaveBeenCalled();
  });
  return latestProcess();
}

/** Reports a successful composition on the given process, once fake timers advance. */
async function composeSuccessfully(process_: FakeRoverProcess): Promise<void> {
  process_.stdout.emit("data", Buffer.from("🎶 composing supergraph\n"));
  await vi.advanceTimersByTimeAsync(1000);
}

beforeEach(async function isolate() {
  vi.resetModules();
  spawned = [];
  spawnMock.mockClear();
  settingsState.overrides = {};
  settingsState.disabled = [];
  portState.busyChecksLeft = 0;
  vi.useFakeTimers();
  vi.spyOn(process, "kill").mockImplementation(function fakeKill() {
    return true;
  });
});

afterEach(function restoreRealTimersAndSignals() {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(function removeTempDir() {
  rmSync(GENERATED_DIR, { recursive: true, force: true });
});

async function freshRover() {
  return import("@/main/services/rover/rover.service");
}

describe("status reflects whether the graph is actually up", () => {
  it("starts stopped", async () => {
    const { supergraph } = await freshRover();

    expect(supergraph.status()).toBe("stopped");
  });

  it("does not report running the instant rover's process spawns — only once rover confirms the graph composed", async () => {
    const { supergraph } = await freshRover();

    const starting = supergraph.start();
    await spawnedProcess();
    await starting;

    expect(supergraph.status()).toBe("starting");
  });

  it("becomes running as soon as rover announces it, without waiting out the silence timeout", async () => {
    const { supergraph } = await freshRover();

    const starting = supergraph.start();
    const process_ = await spawnedProcess();
    await starting;

    process_.stdout.emit("data", Buffer.from("🎶 composing supergraph\n"));
    process_.stdout.emit(
      "data",
      Buffer.from(
        "🚀 your supergraph is running! head to http://localhost:4041\n"
      )
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(supergraph.status()).toBe("running");
  });
});

describe("starting the supergraph spawns rover with the right config", () => {
  it("spawns rover with the expected flags and resolves once the process is up, not once composed", async () => {
    const { supergraph } = await freshRover();

    const starting = supergraph.start();
    await composeSuccessfully(await spawnedProcess());
    const result = await starting;

    expect(result).toBe("starting");
    expect(supergraph.status()).toBe("running");
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const args = spawnMock.mock.calls[0][1] as string[];
    expect(args).toEqual([
      "dev",
      "--supergraph-config",
      expect.stringContaining("supergraph.current.yaml"),
      "--router-config",
      expect.stringContaining("router.yaml"),
      "--supergraph-port",
      "4041",
      "--graph-ref",
      "local-supergraph@current",
    ]);
  });
});

describe("the generated config applies overrides and disabled subgraphs", () => {
  it("excludes a disabled subgraph and keeps the rest", async () => {
    const { setSubgraphEnabled, supergraph } = await freshRover();
    await setSubgraphEnabled("characters", false);

    const starting = supergraph.start();
    await composeSuccessfully(await spawnedProcess());
    await starting;

    const yaml = readFileSync(
      join(GENERATED_DIR, "supergraph.current.yaml"),
      "utf8"
    );
    expect(yaml).not.toContain("characters");
    expect(yaml).toContain("starships");
    expect(yaml).toContain("https://starships.svc/graphql");
  });

  it("uses a local override's url instead of the registry's", async () => {
    const { supergraph, updateOverride } = await freshRover();
    await updateOverride("characters", { local: true, port: 4001 });

    const starting = supergraph.start();
    await composeSuccessfully(await spawnedProcess());
    await starting;

    const yaml = readFileSync(
      join(GENERATED_DIR, "supergraph.current.yaml"),
      "utf8"
    );
    expect(yaml).toContain("http://localhost:4001");
    expect(yaml).not.toContain("https://characters.svc/graphql");
  });
});

describe("changing an override or enabling/disabling a subgraph restarts rover while it's running", () => {
  it("does not spawn rover while stopped — the change just waits for the next start", async () => {
    const { updateOverride } = await freshRover();

    await updateOverride("characters", { local: true, port: 4001 });

    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("restarts rover while running, so the new url actually reaches the router", async () => {
    const { supergraph, updateOverride } = await freshRover();
    const starting = supergraph.start();
    await composeSuccessfully(await spawnedProcess());
    await starting;

    await updateOverride("characters", { local: true, port: 4001 });
    // The restart stops the old process first, so it has to actually exit
    // before the new one spawns.
    latestProcess().emit("close");
    await vi.waitFor(function respawned() {
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });
    await composeSuccessfully(latestProcess());

    expect(process.kill).toHaveBeenCalledWith(-4242, "SIGTERM");
  });

  it("coalesces two rapid changes into a single restart that reflects both", async () => {
    const { setSubgraphEnabled, supergraph, updateOverride } =
      await freshRover();
    const starting = supergraph.start();
    await composeSuccessfully(await spawnedProcess());
    await starting;

    void updateOverride("characters", { local: true, port: 4001 });
    void setSubgraphEnabled("starships", false);
    // The queued restart needs one microtask turn to reach stopRoverDev and
    // attach its close listener before the process actually exits.
    await Promise.resolve();
    latestProcess().emit("close");
    await vi.waitFor(function respawned() {
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });
    await composeSuccessfully(latestProcess());

    const yaml = readFileSync(
      join(GENERATED_DIR, "supergraph.current.yaml"),
      "utf8"
    );
    expect(yaml).toContain("http://localhost:4001");
    expect(yaml).not.toContain("starships");
  });
});

describe("stopping waits for the router port to actually free up", () => {
  it("resolves once rover actually exits", async () => {
    const { supergraph } = await freshRover();
    const starting = supergraph.start();
    await composeSuccessfully(await spawnedProcess());
    await starting;

    const stopping = supergraph.stop();
    latestProcess().emit("close");
    const result = await stopping;

    expect(result).toBe("stopped");
    expect(supergraph.status()).toBe("stopped");
  });

  it("works on a start that has not composed yet", async () => {
    const { supergraph } = await freshRover();
    const starting = supergraph.start();
    await vi.waitFor(function spawnedOnce() {
      expect(spawnMock).toHaveBeenCalledTimes(1);
    });

    // Rover has spawned but has not said anything about composing yet.
    await expect(starting).resolves.toBe("starting");
    const stopping = supergraph.stop();
    latestProcess().emit("close");

    await expect(stopping).resolves.toBe("stopped");
  });

  it("kills the group again if the port is still held after the grace period", async () => {
    const { supergraph } = await freshRover();
    const starting = supergraph.start();
    await composeSuccessfully(await spawnedProcess());
    await starting;

    portState.busyChecksLeft = Infinity;
    const stopping = supergraph.stop();
    latestProcess().emit("close");

    await vi.advanceTimersByTimeAsync(5000);
    await stopping;

    expect(process.kill).toHaveBeenCalledWith(-4242, "SIGTERM");
    expect(process.kill).toHaveBeenCalledWith(-4242, "SIGKILL");
  });
});
