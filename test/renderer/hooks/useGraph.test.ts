import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGraph } from "@/renderer/hooks/useGraph";

const api = vi.hoisted(() => ({
  graphName: vi.fn(),
  variantFilter: vi.fn(),
  currentVariant: vi.fn(),
  updateVariant: vi.fn(),
  allVariants: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    environment: {
      graphName: () => api.graphName(),
    },
    settings: {
      variantFilter: () => api.variantFilter(),
      currentVariant: () => api.currentVariant(),
      updateVariant: (name: string) => api.updateVariant(name),
    },
    apollo: {
      allVariants: () => api.allVariants(),
    },
  },
}));

beforeEach(function isolate() {
  api.graphName.mockReset().mockResolvedValue("my-graph");
  api.variantFilter.mockReset().mockResolvedValue([]);
  api.currentVariant.mockReset().mockResolvedValue("current");
  api.updateVariant.mockReset().mockImplementation(function echo(name: string) {
    return Promise.resolve(name);
  });
  api.allVariants.mockReset().mockResolvedValue([]);
});

describe("with no filter set, the dropdown offers every variant the graph has", () => {
  it("asks Apollo for every variant instead of an empty list", async () => {
    api.allVariants.mockResolvedValue(["current", "staging"]);
    const { result } = renderHook(() => useGraph());

    await waitFor(function loaded() {
      expect(result.current.variants).toEqual(["current", "staging"]);
    });
  });

  it("keeps the saved variant when Apollo's list still offers it", async () => {
    api.allVariants.mockResolvedValue(["current", "staging"]);
    api.currentVariant.mockResolvedValue("staging");
    const { result } = renderHook(() => useGraph());

    await waitFor(function loaded() {
      expect(result.current.variant).toBe("staging");
    });
    expect(api.updateVariant).not.toHaveBeenCalled();
  });

  it("falls back and persists a new choice when the saved variant is gone", async () => {
    api.allVariants.mockResolvedValue(["current", "staging"]);
    api.currentVariant.mockResolvedValue("retired");
    const { result } = renderHook(() => useGraph());

    await waitFor(function loaded() {
      expect(result.current.variant).toBe("current");
    });
    expect(api.updateVariant).toHaveBeenCalledWith("current");
  });
});

describe("an explicit filter narrows the dropdown without ever asking Apollo for the full list", () => {
  it("offers only the filtered variants", async () => {
    api.variantFilter.mockResolvedValue(["staging"]);
    api.currentVariant.mockResolvedValue("staging");
    const { result } = renderHook(() => useGraph());

    await waitFor(function loaded() {
      expect(result.current.variants).toEqual(["staging"]);
    });
    expect(api.allVariants).not.toHaveBeenCalled();
  });
});

describe("selecting a variant persists the choice", () => {
  it("select calls the bridge and adopts what it returns", async () => {
    api.variantFilter.mockResolvedValue(["current", "staging"]);
    api.currentVariant.mockResolvedValue("current");
    const { result } = renderHook(() => useGraph());
    await waitFor(function loaded() {
      expect(result.current.variant).toBe("current");
    });
    api.updateVariant.mockResolvedValue("staging");

    await act(async () => {
      result.current.select("staging");
      await Promise.resolve();
    });

    expect(api.updateVariant).toHaveBeenCalledWith("staging");
    expect(result.current.variant).toBe("staging");
  });
});
