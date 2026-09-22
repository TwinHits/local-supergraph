import { beforeEach, describe, expect, it, vi } from "vitest";

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
}));

vi.mock("@/main/services/environment/environment.service", () => ({
  environment: {
    graphName: () => environmentState.graphName,
    apolloKey: () => "",
  },
}));

const settingsState = vi.hoisted(() => ({
  currentVariant: "current",
  variantFilter: ["current", "staging"],
}));

vi.mock("@/main/services/settings/settings.service", () => ({
  settings: {
    currentVariant: () => settingsState.currentVariant,
    variantFilter: () => settingsState.variantFilter,
  },
}));

const answer = vi.fn();
vi.stubGlobal("fetch", answer);

const errorsState = vi.hoisted(() => ({
  addSupergraphError: vi.fn(),
  clearSupergraphError: vi.fn(),
}));

vi.mock("@/main/services/errors/errors.service", () => ({
  addSupergraphError: errorsState.addSupergraphError,
  clearSupergraphError: errorsState.clearSupergraphError,
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
  settingsState.currentVariant = "current";
  settingsState.variantFilter = ["current", "staging"];
  errorsState.addSupergraphError.mockClear();
  errorsState.clearSupergraphError.mockClear();
  roverState.handler = () =>
    Promise.resolve({ stdout: LISTING, stderr: "", found: true });
  answer.mockReset();
});

describe("parsing rover's subgraph list", () => {
  it("reads the registered subgraphs", () => {
    const actual = parseSubgraphList(LISTING);

    expect(actual.subgraphs).toEqual([
      { name: "planets", routingUrl: "http://localhost:4003/" },
      { name: "characters", routingUrl: "http://localhost:4001/" },
    ]);
  });

  it("a listing has not failed", () => {
    const actual = parseSubgraphList(LISTING);

    expect(actual.failed).toBe(false);
  });

  it("names a rejected key by its code, not its wording", () => {
    const actual = parseSubgraphList(BAD_KEY);

    expect(actual.keys).toEqual([ErrorKey.ApolloKeyInvalid]);
  });

  it("keeps rover's message for a failure", () => {
    const actual = parseSubgraphList(BAD_KEY);

    expect(actual.raw).toContain("401 Unauthorized");
  });

  it("an unrecognised code names no signature, and leaves the text to say why", () => {
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

  it("output that is not JSON is a failure carrying whatever rover wrote", () => {
    const actual = parseSubgraphList("rover fell over");

    expect(actual.failed).toBe(true);
    expect(actual.raw).toBe("rover fell over");
  });

  it("a listing with no subgraphs is still a listing", () => {
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
});

describe("the subgraph list is cached per variant", () => {
  it("listSubgraphs returns the registry's subgraphs", async () => {
    const { apollo } = await freshApollo();

    const result = await apollo.listSubgraphs();

    expect(result).toEqual([
      { name: "planets", routingUrl: "http://localhost:4003/" },
      { name: "characters", routingUrl: "http://localhost:4001/" },
    ]);
  });

  it("a second call reuses the cached listing instead of asking rover again", async () => {
    const runRoverSpy = vi.fn(roverState.handler);
    roverState.handler = runRoverSpy;
    const { apollo } = await freshApollo();

    await apollo.listSubgraphs();
    await apollo.listSubgraphs();

    expect(runRoverSpy).toHaveBeenCalledTimes(1);
  });

  it("reloadSubgraphs always asks rover again, bypassing the cache", async () => {
    const runRoverSpy = vi.fn(roverState.handler);
    roverState.handler = runRoverSpy;
    const { apollo } = await freshApollo();

    await apollo.listSubgraphs();
    await apollo.reloadSubgraphs();

    expect(runRoverSpy).toHaveBeenCalledTimes(2);
  });

  it("different variants are cached independently", async () => {
    const runRoverSpy = vi.fn(roverState.handler);
    roverState.handler = runRoverSpy;
    const { apollo } = await freshApollo();

    await apollo.listSubgraphs();
    settingsState.currentVariant = "staging";
    await apollo.listSubgraphs();

    expect(runRoverSpy).toHaveBeenCalledTimes(2);
  });
});

describe("a graph the app can't read is reported as a failure, not shown as empty", () => {
  it("rover not being installed is reported as RoverMissing and yields no subgraphs", async () => {
    roverState.handler = () =>
      Promise.resolve({ stdout: "", stderr: "", found: false });
    const { apollo } = await freshApollo();

    const result = await apollo.listSubgraphs();

    expect(result).toEqual([]);
    expect(errorsState.addSupergraphError).toHaveBeenCalledWith(
      [ErrorKey.RoverMissing],
      "rover is not installed."
    );
  });

  it("an unset graph ref is reported without asking rover", async () => {
    environmentState.graphName = "";
    const runRoverSpy = vi.fn(roverState.handler);
    roverState.handler = runRoverSpy;
    const { apollo } = await freshApollo();

    const result = await apollo.listSubgraphs();

    expect(result).toEqual([]);
    expect(runRoverSpy).not.toHaveBeenCalled();
    expect(errorsState.addSupergraphError).toHaveBeenCalledWith(
      [ErrorKey.GraphRefUnset],
      expect.stringContaining("is not set")
    );
  });

  it("a successful listing clears any prior failure", async () => {
    const { apollo } = await freshApollo();

    await apollo.listSubgraphs();

    expect(errorsState.clearSupergraphError).toHaveBeenCalled();
  });
});

describe("every variant is cached at startup", () => {
  it("cacheAllVariants caches every variant so listSubgraphs does not ask rover again", async () => {
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

  it("reports a failure from any variant that could not be listed", async () => {
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
      expect(errorsState.addSupergraphError).toHaveBeenCalledWith(
        [ErrorKey.RoverMissing],
        "rover is not installed."
      );
    });
  });

  it("clears any prior failure once every variant succeeds", async () => {
    const { cacheAllVariants } = await freshApollo();

    cacheAllVariants();

    await vi.waitFor(function cleared() {
      expect(errorsState.clearSupergraphError).toHaveBeenCalled();
    });
  });
});

describe("every variant the graph has comes straight from Apollo Studio, not rover", () => {
  it("returns every variant name from a successful answer", async () => {
    answer.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            graph: { variants: [{ name: "current" }, { name: "staging" }] },
          },
        }),
    });
    const { apollo } = await freshApollo();

    const actual = await apollo.allVariants();

    expect(actual).toEqual(["current", "staging"]);
  });

  it("asks nothing when no graph is set", async () => {
    environmentState.graphName = "";
    const { apollo } = await freshApollo();

    const actual = await apollo.allVariants();

    expect(actual).toEqual([]);
    expect(answer).not.toHaveBeenCalled();
  });

  it("a GraphQL error in the response yields no variants", async () => {
    answer.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ errors: [{ message: "boom" }] }),
    });
    const { apollo } = await freshApollo();

    const actual = await apollo.allVariants();

    expect(actual).toEqual([]);
  });

  it("an HTTP failure yields no variants", async () => {
    answer.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });
    const { apollo } = await freshApollo();

    const actual = await apollo.allVariants();

    expect(actual).toEqual([]);
  });

  it("a network failure yields no variants instead of throwing", async () => {
    answer.mockRejectedValue(new Error("network down"));
    const { apollo } = await freshApollo();

    await expect(apollo.allVariants()).resolves.toEqual([]);
  });
});
