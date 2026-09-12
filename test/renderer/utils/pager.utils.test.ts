import { describe, expect, it } from "vitest";

import {
  canGoBack,
  getNextIndex,
  getPreviousIndex,
  hasArrows,
} from "@/renderer/utils/pager.utils";

describe("paging through a list of errors", () => {
  it("one error shows no arrows", () => {
    expect(hasArrows(1)).toBe(false);
  });

  it("two errors show arrows", () => {
    expect(hasArrows(2)).toBe(true);
  });

  it("back is disabled on the first error", () => {
    expect(canGoBack(0)).toBe(false);
  });

  it("back is enabled once past the first error", () => {
    expect(canGoBack(1)).toBe(true);
  });

  it("next steps forward", () => {
    expect(getNextIndex(0, 4)).toBe(1);
  });

  it("next wraps from the last error to the first", () => {
    expect(getNextIndex(3, 4)).toBe(0);
  });

  it("back steps backward", () => {
    expect(getPreviousIndex(2)).toBe(1);
  });

  it("back stays put on the first error", () => {
    expect(getPreviousIndex(0)).toBe(0);
  });
});
