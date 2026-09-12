import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSubgraphs } from "@/renderer/features/SupergraphWorkspace/useSubgraphs";

const SUBGRAPHS = [
  { name: "characters", routingUrl: "https://characters.svc/graphql" },
  { name: "starships", routingUrl: "https://starships.svc/graphql" },
];

const api = vi.hoisted(() => ({
  listSubgraphs: vi.fn(),
  reloadSubgraphs: vi.fn(),
  overrides: vi.fn(),
  checkHealth: vi.fn(),
  disabledSubgraphs: vi.fn(),
  updateOverride: vi.fn(),
  setSubgraphEnabled: vi.fn(),
  subgraphErrors: vi.fn(),
  supergraphErrors: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    apollo: {
      listSubgraphs: () => api.listSubgraphs(),
      reloadSubgraphs: () => api.reloadSubgraphs(),
    },
    subgraph: {
      overrides: () => api.overrides(),
      checkHealth: () => api.checkHealth(),
      disabledSubgraphs: () => api.disabledSubgraphs(),
      updateOverride: (name: string, override: unknown) =>
        api.updateOverride(name, override),
      setSubgraphEnabled: (name: string, enabled: boolean) =>
        api.setSubgraphEnabled(name, enabled),
    },
    errors: {
      subgraphErrors: () => api.subgraphErrors(),
      supergraphErrors: () => api.supergraphErrors(),
    },
  },
}));

/** The row the hook built for one subgraph, or undefined if it isn't there. */
function rowFor(rows: ReturnType<typeof useSubgraphs>["rows"], name: string) {
  return rows.find(function matches(row) {
    return row.name === name;
  });
}

beforeEach(function isolate() {
  api.listSubgraphs.mockReset().mockResolvedValue(SUBGRAPHS);
  api.reloadSubgraphs.mockReset().mockResolvedValue(SUBGRAPHS);
  api.overrides.mockReset().mockResolvedValue({});
  api.checkHealth.mockReset().mockResolvedValue({});
  api.disabledSubgraphs.mockReset().mockResolvedValue([]);
  api.updateOverride.mockReset().mockResolvedValue({});
  api.setSubgraphEnabled.mockReset().mockResolvedValue([]);
  api.subgraphErrors.mockReset().mockResolvedValue({});
  api.supergraphErrors.mockReset().mockResolvedValue([]);
});

describe("loading merges the subgraph list, overrides, health, and disabled state into one row per subgraph", () => {
  it("shows one row per subgraph once loaded", async () => {
    const { result } = renderHook(() => useSubgraphs(4041, false, "current"));

    await waitFor(function loaded() {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows.map((row) => row.name)).toEqual([
      "characters",
      "starships",
    ]);
  });

  it("is loading until the subgraph list, overrides, and health have all arrived", () => {
    const { result } = renderHook(() => useSubgraphs(4041, false, "current"));

    expect(result.current.loading).toBe(true);
    expect(result.current.rows).toEqual([]);
  });
});

describe("switching variant reloads the table and resets its search and sort", () => {
  it("clears search and sort when the variant changes", async () => {
    const { rerender, result } = renderHook(
      ({ variant }: { variant: string }) => useSubgraphs(4041, false, variant),
      { initialProps: { variant: "current" } }
    );
    await waitFor(function loaded() {
      expect(result.current.loading).toBe(false);
    });

    act(function typeSearch() {
      result.current.setSearch("star");
    });
    expect(result.current.search).toBe("star");

    rerender({ variant: "staging" });

    expect(result.current.search).toBe("");
  });

  it("reloads the subgraph list for the new variant", async () => {
    const { rerender, result } = renderHook(
      ({ variant }: { variant: string }) => useSubgraphs(4041, false, variant),
      { initialProps: { variant: "current" } }
    );
    await waitFor(function loaded() {
      expect(result.current.loading).toBe(false);
    });
    api.listSubgraphs.mockClear();

    rerender({ variant: "staging" });

    await waitFor(function calledAgain() {
      expect(api.listSubgraphs).toHaveBeenCalled();
    });
  });
});

describe("changing a subgraph's override marks it pending right away, then settles once main confirms it", () => {
  it("marks the row pending the instant an override changes", async () => {
    const { result } = renderHook(() => useSubgraphs(4041, false, "current"));
    await waitFor(function loaded() {
      expect(result.current.loading).toBe(false);
    });
    api.checkHealth.mockResolvedValue({ characters: "reachable" });
    let resolveUpdate: (value: unknown) => void = () => {};
    api.updateOverride.mockImplementationOnce(
      () =>
        new Promise(function pending(resolve) {
          resolveUpdate = resolve;
        })
    );

    act(function toggleLocal() {
      result.current.updateOverride("characters", true, 4001);
    });

    expect(rowFor(result.current.rows, "characters")?.status).toBe("pending");

    await act(async () => {
      resolveUpdate({ characters: { local: true, port: 4001 } });
      await Promise.resolve();
    });
  });

  it("shows the override's local choice and port once main confirms it", async () => {
    const { result } = renderHook(() => useSubgraphs(4041, false, "current"));
    await waitFor(function loaded() {
      expect(result.current.loading).toBe(false);
    });
    api.updateOverride.mockResolvedValue({
      characters: { local: true, port: 4001 },
    });

    await act(async () => {
      result.current.updateOverride("characters", true, 4001);
      await Promise.resolve();
      await Promise.resolve();
    });

    const row = rowFor(result.current.rows, "characters");
    expect(row?.local).toBe(true);
    expect(row?.port).toBe(4001);
  });
});

describe("a health check already running when an override changes never overwrites the fresher result", () => {
  it("discards the stale check even though it resolves last", async () => {
    const { result } = renderHook(() => useSubgraphs(4041, false, "current"));
    await waitFor(function loaded() {
      expect(result.current.loading).toBe(false);
    });

    // The first change starts a health check that will hang until told to
    // resolve, standing in for one still in flight when the next change lands.
    let resolveStaleCheck: (value: Record<string, string>) => void = () => {};
    api.checkHealth.mockImplementationOnce(
      () =>
        new Promise(function pending(resolve) {
          resolveStaleCheck = resolve;
        })
    );
    api.updateOverride.mockResolvedValueOnce({
      characters: { local: true, port: 4001 },
    });
    await act(async () => {
      result.current.updateOverride("characters", true, 4001);
      await Promise.resolve();
    });

    // A second, later change starts its own check, which answers normally.
    api.checkHealth.mockResolvedValueOnce({ characters: "unreachable" });
    api.updateOverride.mockResolvedValueOnce({
      characters: { local: false, port: null },
    });
    await act(async () => {
      result.current.updateOverride("characters", false, null);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rowFor(result.current.rows, "characters")?.status).toBe("failed");

    // The stale check now answers "reachable" — it must lose the race.
    await act(async () => {
      resolveStaleCheck({ characters: "reachable" });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rowFor(result.current.rows, "characters")?.status).toBe("failed");
  });
});

describe("refresh reloads the table and reports while it's in flight", () => {
  it("sets refreshing true until the reload finishes", async () => {
    const { result } = renderHook(() => useSubgraphs(4041, false, "current"));
    await waitFor(function loaded() {
      expect(result.current.refreshing).toBe(false);
    });

    let resolveReload: (value: typeof SUBGRAPHS) => void = () => {};
    api.reloadSubgraphs.mockImplementationOnce(
      () =>
        new Promise(function pending(resolve) {
          resolveReload = resolve;
        })
    );

    act(function triggerReload() {
      result.current.reload();
    });
    expect(result.current.refreshing).toBe(true);

    await act(async () => {
      resolveReload(SUBGRAPHS);
      await Promise.resolve();
    });

    await waitFor(function settled() {
      expect(result.current.refreshing).toBe(false);
    });
  });
});
