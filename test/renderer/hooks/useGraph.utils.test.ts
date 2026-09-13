import { describe, expect, it } from "vitest";

import { reconcileVariant } from "@/renderer/hooks/useGraph.utils";

describe("the shown variant falls back to something real when the saved choice isn't offered", () => {
  it("keeps the current variant when it is in the list offered", () => {
    const actual = reconcileVariant(["current", "staging"], "staging");

    expect(actual).toBeNull();
  });

  it("falls back to the first offered variant when the current one is not in the list", () => {
    const actual = reconcileVariant(["current", "staging"], "retired");

    expect(actual).toBe("current");
  });

  it("does nothing when nothing is offered yet", () => {
    const actual = reconcileVariant([], "current");

    expect(actual).toBeNull();
  });
});
