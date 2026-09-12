import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@/main/services/environment/environment.service", () => ({
  environment: {
    variants: () => ["current", "staging"],
  },
}));

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

test("a subgraph with no override yet has none", async () => {
  const { currentOverrides } = await freshSettings();

  expect(currentOverrides()).toEqual({});
});

test("updating an override saves it for the current variant", async () => {
  const { currentOverrides, updateCurrentOverride } = await freshSettings();

  updateCurrentOverride("characters", { local: true, port: 4001 });

  expect(currentOverrides()).toEqual({
    characters: { local: true, port: 4001 },
  });
});

test("overrides are kept separate per variant", async () => {
  const { currentOverrides, settings, updateCurrentOverride } =
    await freshSettings();

  updateCurrentOverride("characters", { local: true, port: 4001 });
  settings.updateVariant("staging");

  expect(currentOverrides()).toEqual({});
});

test("a saved override survives being reloaded from disk", async () => {
  const first = await freshSettings();
  first.updateCurrentOverride("characters", { local: true, port: 4001 });

  const second = await freshSettings();

  expect(second.currentOverrides()).toEqual({
    characters: { local: true, port: 4001 },
  });
});

test("disabling a subgraph adds it to the current variant's list", async () => {
  const { currentDisabledSubgraphs, setSubgraphEnabled } =
    await freshSettings();

  setSubgraphEnabled("characters", false);

  expect(currentDisabledSubgraphs()).toEqual(["characters"]);
});

test("re-enabling a subgraph removes it from the list", async () => {
  const { currentDisabledSubgraphs, setSubgraphEnabled } =
    await freshSettings();

  setSubgraphEnabled("characters", false);
  setSubgraphEnabled("characters", true);

  expect(currentDisabledSubgraphs()).toEqual([]);
});

test("disabling the same subgraph twice does not duplicate it", async () => {
  const { currentDisabledSubgraphs, setSubgraphEnabled } =
    await freshSettings();

  setSubgraphEnabled("characters", false);
  setSubgraphEnabled("characters", false);

  expect(currentDisabledSubgraphs()).toEqual(["characters"]);
});

test("a variant not offered anymore falls back to the first one", async () => {
  const { settings } = await freshSettings();

  settings.updateVariant("retired-variant");

  expect(settings.currentVariant()).toBe("current");
});
