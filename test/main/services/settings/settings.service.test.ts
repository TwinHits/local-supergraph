import { existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CONFIG_FILE = join(tmpdir(), "local-supergraph-settings.test.json");

function removeConfigFile(): void {
  if (existsSync(CONFIG_FILE)) {
    rmSync(CONFIG_FILE);
  }
}

/** A fresh module instance pointed at the test's own config file. */
async function freshSettings() {
  vi.resetModules();
  const module = await import("@/main/services/settings/settings.service");
  module.registerConfigFile(CONFIG_FILE);
  return module;
}

beforeEach(removeConfigFile);
afterEach(removeConfigFile);

describe("overrides are stored per variant", () => {
  it("a subgraph with no override yet has none", async () => {
    const { currentOverrides } = await freshSettings();

    expect(currentOverrides()).toEqual({});
  });

  it("updating an override saves it for the current variant", async () => {
    const { currentOverrides, updateCurrentOverride } = await freshSettings();

    updateCurrentOverride("characters", { local: true, port: 4001 });

    expect(currentOverrides()).toEqual({
      characters: { local: true, port: 4001 },
    });
  });

  it("overrides are kept separate per variant", async () => {
    const { currentOverrides, settings, updateCurrentOverride } =
      await freshSettings();

    updateCurrentOverride("characters", { local: true, port: 4001 });
    settings.updateVariant("staging");

    expect(currentOverrides()).toEqual({});
  });

  it("a saved override survives being reloaded from disk", async () => {
    const first = await freshSettings();
    first.updateCurrentOverride("characters", { local: true, port: 4001 });

    const second = await freshSettings();

    expect(second.currentOverrides()).toEqual({
      characters: { local: true, port: 4001 },
    });
  });
});

describe("a subgraph can be disabled and re-enabled, per variant", () => {
  it("disabling a subgraph adds it to the current variant's list", async () => {
    const { currentDisabledSubgraphs, setSubgraphEnabled } =
      await freshSettings();

    setSubgraphEnabled("characters", false);

    expect(currentDisabledSubgraphs()).toEqual(["characters"]);
  });

  it("re-enabling a subgraph removes it from the list", async () => {
    const { currentDisabledSubgraphs, setSubgraphEnabled } =
      await freshSettings();

    setSubgraphEnabled("characters", false);
    setSubgraphEnabled("characters", true);

    expect(currentDisabledSubgraphs()).toEqual([]);
  });

  it("disabling the same subgraph twice does not duplicate it", async () => {
    const { currentDisabledSubgraphs, setSubgraphEnabled } =
      await freshSettings();

    setSubgraphEnabled("characters", false);
    setSubgraphEnabled("characters", false);

    expect(currentDisabledSubgraphs()).toEqual(["characters"]);
  });
});

describe("the current variant falls back to a real one if the saved choice is gone", () => {
  it("a variant not offered anymore falls back to the first one", async () => {
    const { settings } = await freshSettings();

    settings.updateVariantFilter(["current", "staging"]);
    settings.updateVariant("retired-variant");

    expect(settings.currentVariant()).toBe("current");
  });
});

describe("with no filter set, the saved variant is trusted as-is", () => {
  it("does not second-guess a variant that isn't checked against any local list", async () => {
    const { settings } = await freshSettings();

    settings.updateVariant("develop1");

    expect(settings.currentVariant()).toBe("develop1");
  });
});

describe("the variant filter is what SUPERGRAPH_VARIANTS used to be — a setting now, not an env var", () => {
  it("starts empty, meaning every variant is offered", async () => {
    const { settings } = await freshSettings();

    expect(settings.variantFilter()).toEqual([]);
  });

  it("remembers an updated filter", async () => {
    const { settings } = await freshSettings();

    settings.updateVariantFilter(["current", "staging"]);

    expect(settings.variantFilter()).toEqual(["current", "staging"]);
  });

  it("a saved filter survives being reloaded from disk", async () => {
    const first = await freshSettings();
    first.settings.updateVariantFilter(["current"]);

    const second = await freshSettings();

    expect(second.settings.variantFilter()).toEqual(["current"]);
  });
});

describe("the current environment is stored alongside the other settings", () => {
  it("starts out empty", async () => {
    const { settings } = await freshSettings();

    expect(settings.currentEnvironment()).toBe("");
  });

  it("remembers an updated pick", async () => {
    const { settings } = await freshSettings();

    settings.updateEnvironment("dev");

    expect(settings.currentEnvironment()).toBe("dev");
  });

  it("a saved pick survives being reloaded from disk", async () => {
    const first = await freshSettings();
    first.settings.updateEnvironment("dev");

    const second = await freshSettings();

    expect(second.settings.currentEnvironment()).toBe("dev");
  });
});

describe("reading settings before the config file is registered does not lock the service onto empty defaults", () => {
  it("still loads the real file once the path is registered, even if something read settings earlier", async () => {
    writeFileSync(
      CONFIG_FILE,
      JSON.stringify({
        settings: {},
        currentVariant: "develop1",
        variantFilter: [],
        subgraphOverrides: {},
        disabledSubgraphs: {},
      })
    );
    vi.resetModules();
    const module = await import("@/main/services/settings/settings.service");

    // Simulates code that reads settings before registerConfigFile runs —
    // the exact order a startup regression once put main.ts in.
    module.settings.currentVariant();
    module.registerConfigFile(CONFIG_FILE);

    expect(module.settings.currentVariant()).toBe("develop1");
  });
});
