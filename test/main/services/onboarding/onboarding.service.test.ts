import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

import { ErrorKey } from "@/shared/errors/errors.types";
import { Prerequisite } from "@/shared/onboarding/onboarding.types";

const WORK_DIR = mkdtempSync(join(tmpdir(), "local-supergraph-onboarding-"));
const ENV_FILE = join(WORK_DIR, ".env");
const DATABASES_CONFIG_FILE = join(WORK_DIR, "databases.json");
const SETTINGS_FILE = join(WORK_DIR, "config.json");
const ROVER_INSTALLED_PATH = join(WORK_DIR, ".rover", "bin", "rover");

const APP_VERSION = "1.3.0";
const GOOD_KEY = "user:good";
const GRAPH_REF = "my-graph@current";

vi.mock(
  "@/main/services/environment/environment.constants",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/main/services/environment/environment.constants")
      >();
    return { ...actual, ENV_FILE };
  }
);

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

vi.mock("@/main/services/rover/rover.constants", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/main/services/rover/rover.constants")
    >();
  return {
    ...actual,
    INSTALLED_PATH: ROVER_INSTALLED_PATH,
    GENERATED_DIR: WORK_DIR,
  };
});

const LISTING = JSON.stringify({
  json_version: "1",
  data: {
    subgraphs: [{ name: "characters", url: "http://localhost:4001/" }],
    success: true,
  },
  error: null,
});

const BAD_KEY = JSON.stringify({
  json_version: "1",
  data: { success: false },
  error: {
    message: "HTTP status client error (401 Unauthorized) for url (...)",
    code: "E004",
  },
});

/** Which commands are installed, and how each one answers. */
const machine = vi.hoisted(() => ({
  installed: new Set<string>(),
  pluginExitsWithError: false,
  roverKeys: [] as (string | undefined)[],
}));

vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");

  function execFile(): void {}
  (execFile as unknown as Record<symbol, unknown>)[promisify.custom] =
    function answer(
      command: string,
      args: string[],
      options?: { env?: NodeJS.ProcessEnv }
    ) {
      if (!machine.installed.has(command)) {
        return Promise.reject(
          Object.assign(new Error("not found"), { code: "ENOENT" })
        );
      }
      if (
        command === "session-manager-plugin" &&
        machine.pluginExitsWithError
      ) {
        return Promise.reject(Object.assign(new Error("usage"), { code: 1 }));
      }
      if (args[0] === "subgraph") {
        const key = options?.env?.APOLLO_KEY;
        machine.roverKeys.push(key);
        return Promise.resolve({
          stdout: key === GOOD_KEY ? LISTING : BAD_KEY,
          stderr: "",
        });
      }
      return Promise.resolve({ stdout: "", stderr: "" });
    };

  function spawn(): void {}
  return { execFile, spawn, default: { execFile, spawn } };
});

const ENV_KEYS = ["APOLLO_KEY", "APOLLO_GRAPH_REF", "AWS_REGION"] as const;
let savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

function installEverything(): void {
  machine.installed = new Set(["rover", "aws", "session-manager-plugin"]);
  writeFileSync(DATABASES_CONFIG_FILE, "{}");
}

function removeWorkFiles(): void {
  for (const file of [ENV_FILE, DATABASES_CONFIG_FILE, SETTINGS_FILE]) {
    rmSync(file, { force: true });
  }
  rmSync(join(WORK_DIR, ".rover"), { recursive: true, force: true });
}

/** A fresh app launch: new module instances reading the same files. */
async function launch(version = APP_VERSION) {
  vi.resetModules();
  const settingsModule =
    await import("@/main/services/settings/settings.service");
  settingsModule.registerConfigFile(SETTINGS_FILE);
  const onboardingModule =
    await import("@/main/services/onboarding/onboarding.service");
  onboardingModule.registerAppVersion(version);
  const errorsModule = await import("@/main/services/errors/errors.service");
  return {
    onboarding: onboardingModule.onboarding,
    settings: settingsModule.settings,
    errors: errorsModule.errors,
  };
}

beforeEach(function isolate() {
  removeWorkFiles();
  installEverything();
  machine.pluginExitsWithError = false;
  machine.roverKeys = [];
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(function restoreEnvironment() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

afterAll(function removeWorkDir() {
  rmSync(WORK_DIR, { recursive: true, force: true });
});

describe("the wizard shows when it has never been completed on the app's current version", () => {
  it("is not completed on a first launch", async () => {
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.completed).toBe(false);
  });

  it("is completed once it is finished", async () => {
    const { onboarding } = await launch();

    await onboarding.complete();
    const actual = await onboarding.status();

    expect(actual.completed).toBe(true);
  });
});

describe("finishing the wizard is remembered across restarts, until the app's version changes", () => {
  it("is still completed after a restart on the same version", async () => {
    const first = await launch();
    await first.onboarding.complete();

    const second = await launch();
    const actual = await second.onboarding.status();

    expect(actual.completed).toBe(true);
  });

  it("is not completed after a restart on a new version", async () => {
    const first = await launch("1.3.0");
    await first.onboarding.complete();

    const second = await launch("1.4.0");
    const actual = await second.onboarding.status();

    expect(actual.completed).toBe(false);
  });
});

describe("the wizard shows when the Apollo credentials or any prerequisite is missing, even after it has been completed", () => {
  it("reports nothing missing when everything is installed", async () => {
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.missing).toEqual([]);
  });

  it("reports every tool that isn't installed, in step order", async () => {
    machine.installed = new Set();
    rmSync(DATABASES_CONFIG_FILE);
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.missing).toEqual([
      Prerequisite.Rover,
      Prerequisite.AwsCli,
      Prerequisite.SessionManagerPlugin,
      Prerequisite.DatabasesConfig,
    ]);
  });

  it("still reports a missing tool after the wizard was finished", async () => {
    const first = await launch();
    await first.onboarding.complete();
    machine.installed.delete("aws");

    const second = await launch();
    const actual = await second.onboarding.status();

    expect(actual.completed).toBe(true);
    expect(actual.missing).toEqual([Prerequisite.AwsCli]);
  });

  it("still reports missing credentials after the wizard was finished", async () => {
    const first = await launch();
    await first.onboarding.complete();

    const second = await launch();
    const actual = await second.onboarding.status();

    expect(actual.completed).toBe(true);
    expect(actual.configured).toBe(false);
  });

  it("finds rover where its installer puts it, even when it isn't on PATH", async () => {
    machine.installed = new Set([
      ROVER_INSTALLED_PATH,
      "aws",
      "session-manager-plugin",
    ]);
    mkdirSync(join(WORK_DIR, ".rover", "bin"), { recursive: true });
    writeFileSync(ROVER_INSTALLED_PATH, "");
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.missing).toEqual([]);
  });

  it("counts the Session Manager plugin as installed when it runs but exits with an error", async () => {
    machine.pluginExitsWithError = true;
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.missing).toEqual([]);
  });

  it("reports the credentials missing when nothing sets them", async () => {
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.configured).toBe(false);
  });

  it("reports the credentials missing when the graph ref has no variant", async () => {
    writeFileSync(
      ENV_FILE,
      `APOLLO_KEY=${GOOD_KEY}\nAPOLLO_GRAPH_REF=my-graph\n`
    );
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.configured).toBe(false);
  });

  it("reports the credentials set when .env sets them", async () => {
    writeFileSync(
      ENV_FILE,
      `APOLLO_KEY=${GOOD_KEY}\nAPOLLO_GRAPH_REF=${GRAPH_REF}\n`
    );
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.configured).toBe(true);
  });

  it("reports the credentials set when the shell sets them", async () => {
    process.env.APOLLO_KEY = GOOD_KEY;
    process.env.APOLLO_GRAPH_REF = GRAPH_REF;
    const { onboarding } = await launch();

    const actual = await onboarding.status();

    expect(actual.configured).toBe(true);
  });
});

describe("credentials are saved only after the registry accepts them", () => {
  it("saves accepted credentials to .env", async () => {
    const { onboarding } = await launch();

    await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: GRAPH_REF,
    });

    expect(readFileSync(ENV_FILE, "utf8")).toBe(
      `APOLLO_KEY=${GOOD_KEY}\nAPOLLO_GRAPH_REF=${GRAPH_REF}\n`
    );
  });

  it("writes nothing when the registry rejects them", async () => {
    const { onboarding } = await launch();

    await onboarding.submitCredentials({
      apolloKey: "user:bad",
      graphRef: GRAPH_REF,
    });

    expect(existsSync(ENV_FILE)).toBe(false);
  });

  it("checks the credentials it was given, not the ones .env held at launch", async () => {
    writeFileSync(
      ENV_FILE,
      `APOLLO_KEY=user:stale\nAPOLLO_GRAPH_REF=${GRAPH_REF}\n`
    );
    const { onboarding } = await launch();
    await onboarding.status();

    const actual = await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: GRAPH_REF,
    });

    expect(actual).toBe(true);
    expect(machine.roverKeys).toEqual([GOOD_KEY]);
  });

  it("reports accepted credentials as accepted", async () => {
    const { onboarding } = await launch();

    const actual = await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: GRAPH_REF,
    });

    expect(actual).toBe(true);
  });

  it("reports rejected credentials as rejected", async () => {
    const { onboarding } = await launch();

    const actual = await onboarding.submitCredentials({
      apolloKey: "user:bad",
      graphRef: GRAPH_REF,
    });

    expect(actual).toBe(false);
  });
});

describe("a rejected key or unknown graph shows the same diagnosis the Supergraph tab would show", () => {
  it("records a rejected key as the supergraph's failure", async () => {
    const { onboarding, errors } = await launch();

    await onboarding.submitCredentials({
      apolloKey: "user:bad",
      graphRef: GRAPH_REF,
    });
    const actual = errors.supergraphErrors();

    expect(
      actual.map(function toKey(diagnosis) {
        return diagnosis.key;
      })
    ).toEqual([ErrorKey.ApolloKeyInvalid]);
    expect(actual[0].summary).toBe("The Apollo API key was rejected");
  });

  it("records a missing rover the same way launching would", async () => {
    machine.installed.delete("rover");
    const { onboarding, errors } = await launch();

    await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: GRAPH_REF,
    });
    const actual = errors.supergraphErrors();

    expect(
      actual.map(function toKey(diagnosis) {
        return diagnosis.key;
      })
    ).toEqual([ErrorKey.RoverMissing]);
  });

  it("clears the recorded failure once corrected credentials are accepted", async () => {
    const { onboarding, errors } = await launch();
    await onboarding.submitCredentials({
      apolloKey: "user:bad",
      graphRef: GRAPH_REF,
    });

    await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: GRAPH_REF,
    });

    expect(errors.supergraphErrors()).toEqual([]);
  });
});

describe("credentials can be corrected and resubmitted without restarting the app", () => {
  it("accepts a corrected key after a rejection in the same session", async () => {
    const { onboarding } = await launch();
    await onboarding.submitCredentials({
      apolloKey: "user:bad",
      graphRef: GRAPH_REF,
    });

    const actual = await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: GRAPH_REF,
    });

    expect(actual).toBe(true);
    expect(readFileSync(ENV_FILE, "utf8")).toContain(`APOLLO_KEY=${GOOD_KEY}`);
  });
});

describe("saving credentials keeps every other line of an existing .env", () => {
  it("keeps comments and other variables", async () => {
    writeFileSync(
      ENV_FILE,
      "# Region for the Databases tab.\nAWS_REGION=us-west-2\nAPOLLO_KEY=\n"
    );
    const { onboarding } = await launch();

    await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: GRAPH_REF,
    });

    expect(readFileSync(ENV_FILE, "utf8")).toBe(
      `# Region for the Databases tab.\nAWS_REGION=us-west-2\nAPOLLO_KEY=${GOOD_KEY}\nAPOLLO_GRAPH_REF=${GRAPH_REF}\n`
    );
  });
});

describe("after setup, the variant from the graph ref is the selected variant", () => {
  it("selects the variant once the credentials are accepted", async () => {
    const { onboarding, settings } = await launch();

    await onboarding.submitCredentials({
      apolloKey: GOOD_KEY,
      graphRef: "my-graph@staging",
    });

    expect(settings.currentVariant()).toBe("staging");
  });

  it("keeps the previously selected variant when the credentials are rejected", async () => {
    const { onboarding, settings } = await launch();
    settings.updateVariant("current");

    await onboarding.submitCredentials({
      apolloKey: "user:bad",
      graphRef: "my-graph@staging",
    });

    expect(settings.currentVariant()).toBe("current");
  });
});
