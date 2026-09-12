import { beforeEach, expect, test, vi } from "vitest";

import { parseSubgraphList } from "@/main/services/apollo/apollo.service";
import { type RoverResult } from "@/main/services/rover/rover.types";
import { ErrorKey } from "@/shared/errors/errors.types";

type RoverHandler = (args: string[]) => Promise<RoverResult>;

const roverState = vi.hoisted(() => {
  const state: { handler: RoverHandler } = {
    handler: () => Promise.resolve({ stdout: "", stderr: "", found: true }),
  };
  return state;
});

vi.mock("@/main/services/rover/rover.service", () => ({
  runRover: (args: string[]) => roverState.handler(args),
}));

const environmentState = vi.hoisted(() => ({
  graphName: "my-graph",
  variants: ["current", "staging"],
}));

vi.mock("@/main/services/environment/environment.service", () => ({
  environment: {
    graphName: () => environmentState.graphName,
    variants: () => environmentState.variants,
  },
}));

const settingsState = vi.hoisted(() => ({
  currentVariant: "current",
}));

vi.mock("@/main/services/settings/settings.service", () => ({
  settings: {
    currentVariant: () => settingsState.currentVariant,
  },
}));

const errorsState = vi.hoisted(() => ({
  reportSupergraphFailure: vi.fn(),
  clearSupergraphFailure: vi.fn(),
}));

vi.mock("@/main/services/errors/errors.service", () => ({
  reportSupergraphFailure: errorsState.reportSupergraphFailure,
  clearSupergraphFailure: errorsState.clearSupergraphFailure,
}));

/** A fresh module instance so the cache and startup check start empty. */
async function freshApollo() {
  vi.resetModules();
  return import("@/main/services/apollo/apollo.service");
}

const LISTING = JSON.stringify({
  json_version: "1",
  data: {
    subgraphs: [
      { name: "planets", url: "http://localhost:4003/" },
      { name: "characters", url: "http://localhost:4001/" },
    ],
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

beforeEach(function isolate() {
  environmentState.graphName = "my-graph";
  environmentState.variants = ["current", "staging"];
  settingsState.currentVariant = "current";
  errorsState.reportSupergraphFailure.mockClear();
  errorsState.clearSupergraphFailure.mockClear();
  roverState.handler = () =>
    Promise.resolve({ stdout: LISTING, stderr: "", found: true });
});

test("reads the registered subgraphs", () => {
  const actual = parseSubgraphList(LISTING);

  expect(actual.subgraphs).toEqual([
    { name: "planets", routingUrl: "http://localhost:4003/" },
    { name: "characters", routingUrl: "http://localhost:4001/" },
  ]);
});

test("a listing has not failed", () => {
  const actual = parseSubgraphList(LISTING);

  expect(actual.failed).toBe(false);
});

test("names a rejected key by its code, not its wording", () => {
  const actual = parseSubgraphList(BAD_KEY);

  expect(actual.keys).toEqual([ErrorKey.ApolloKeyInvalid]);
});

test("keeps rover's message for a failure", () => {
  const actual = parseSubgraphList(BAD_KEY);

  expect(actual.raw).toContain("401 Unauthorized");
});

test("an unrecognised code names no signature, and leaves the text to say why", () => {
  const actual = parseSubgraphList(
    JSON.stringify({
      data: { success: false },
      error: { code: "E999", message: "boom" },
    })
  );

  expect(actual.failed).toBe(true);
  expect(actual.keys).toEqual([]);
  expect(actual.raw).toBe("boom");
});

test("output that is not JSON is a failure carrying whatever rover wrote", () => {
  const actual = parseSubgraphList("rover fell over");

  expect(actual.failed).toBe(true);
  expect(actual.raw).toBe("rover fell over");
});

test("a listing with no subgraphs is still a listing", () => {
  const actual = parseSubgraphList(
    JSON.stringify({ data: { subgraphs: [], success: true }, error: null })
  );

  expect(actual).toEqual({
    subgraphs: [],
    failed: false,
    keys: [],
    raw: null,
  });
});

test("listSubgraphs returns the registry's subgraphs", async () => {
  const { apollo } = await freshApollo();

  const result = await apollo.listSubgraphs();

  expect(result).toEqual([
    { name: "planets", routingUrl: "http://localhost:4003/" },
    { name: "characters", routingUrl: "http://localhost:4001/" },
  ]);
});

test("a second call reuses the cached listing instead of asking rover again", async () => {
  const runRoverSpy = vi.fn(roverState.handler);
  roverState.handler = runRoverSpy;
  const { apollo } = await freshApollo();

  await apollo.listSubgraphs();
  await apollo.listSubgraphs();

  expect(runRoverSpy).toHaveBeenCalledTimes(1);
});

test("reloadSubgraphs always asks rover again, bypassing the cache", async () => {
  const runRoverSpy = vi.fn(roverState.handler);
  roverState.handler = runRoverSpy;
  const { apollo } = await freshApollo();

  await apollo.listSubgraphs();
  await apollo.reloadSubgraphs();

  expect(runRoverSpy).toHaveBeenCalledTimes(2);
});

test("different variants are cached independently", async () => {
  const runRoverSpy = vi.fn(roverState.handler);
  roverState.handler = runRoverSpy;
  const { apollo } = await freshApollo();

  await apollo.listSubgraphs();
  settingsState.currentVariant = "staging";
  await apollo.listSubgraphs();

  expect(runRoverSpy).toHaveBeenCalledTimes(2);
});

test("rover not being installed is reported as RoverMissing and yields no subgraphs", async () => {
  roverState.handler = () =>
    Promise.resolve({ stdout: "", stderr: "", found: false });
  const { apollo } = await freshApollo();

  const result = await apollo.listSubgraphs();

  expect(result).toEqual([]);
  expect(errorsState.reportSupergraphFailure).toHaveBeenCalledWith(
    [ErrorKey.RoverMissing],
    "rover is not installed."
  );
});

test("an unset graph ref is reported without asking rover", async () => {
  environmentState.graphName = "";
  const runRoverSpy = vi.fn(roverState.handler);
  roverState.handler = runRoverSpy;
  const { apollo } = await freshApollo();

  const result = await apollo.listSubgraphs();

  expect(result).toEqual([]);
  expect(runRoverSpy).not.toHaveBeenCalled();
  expect(errorsState.reportSupergraphFailure).toHaveBeenCalledWith(
    [ErrorKey.GraphRefUnset],
    expect.stringContaining("is not set")
  );
});

test("a successful listing clears any prior failure", async () => {
  const { apollo } = await freshApollo();

  await apollo.listSubgraphs();

  expect(errorsState.clearSupergraphFailure).toHaveBeenCalled();
});

test("cacheAllVariants caches every variant so listSubgraphs does not ask rover again", async () => {
  const runRoverSpy = vi.fn(roverState.handler);
  roverState.handler = runRoverSpy;
  const { apollo, cacheAllVariants } = await freshApollo();

  cacheAllVariants();
  await vi.waitFor(function checkedBothVariants() {
    expect(runRoverSpy).toHaveBeenCalledTimes(2);
  });

  await apollo.listSubgraphs();

  expect(runRoverSpy).toHaveBeenCalledTimes(2);
});

test("cacheAllVariants reports a failure from any variant that could not be listed", async () => {
  roverState.handler = (args: string[]) => {
    const graphRef = args[2] ?? "";
    return Promise.resolve(
      graphRef.endsWith("@staging")
        ? { stdout: "", stderr: "", found: false }
        : { stdout: LISTING, stderr: "", found: true }
    );
  };
  const { cacheAllVariants } = await freshApollo();

  cacheAllVariants();

  await vi.waitFor(function reported() {
    expect(errorsState.reportSupergraphFailure).toHaveBeenCalledWith(
      [ErrorKey.RoverMissing],
      "rover is not installed."
    );
  });
});

test("cacheAllVariants clears any prior failure once every variant succeeds", async () => {
  const { cacheAllVariants } = await freshApollo();

  cacheAllVariants();

  await vi.waitFor(function cleared() {
    expect(errorsState.clearSupergraphFailure).toHaveBeenCalled();
  });
});
