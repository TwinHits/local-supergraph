import { describe, expect, it } from "vitest";

import { LogsDrawerState } from "@/renderer/features/LogsDrawer/LogsDrawer.types";
import {
  isAtBottom,
  nextStateAfterStart,
} from "@/renderer/features/LogsDrawer/LogsDrawer.utils";

describe("starting the thing a drawer watches opens it if hidden, and never re-opens a visible one", () => {
  it("opens a hidden drawer", () => {
    expect(nextStateAfterStart(LogsDrawerState.Hidden)).toBe(
      LogsDrawerState.Open
    );
  });

  it("leaves a minimized drawer where it is", () => {
    expect(nextStateAfterStart(LogsDrawerState.Minimized)).toBe(
      LogsDrawerState.Minimized
    );
  });

  it("leaves an open drawer where it is", () => {
    expect(nextStateAfterStart(LogsDrawerState.Open)).toBe(
      LogsDrawerState.Open
    );
  });

  it("leaves a maximized drawer where it is", () => {
    expect(nextStateAfterStart(LogsDrawerState.Maximized)).toBe(
      LogsDrawerState.Maximized
    );
  });
});

describe("scrolling near the bottom keeps the log following new lines", () => {
  it("counts as at the bottom exactly at the bottom", () => {
    expect(isAtBottom(200, 300, 100)).toBe(true);
  });

  it("counts as at the bottom right at the threshold", () => {
    expect(isAtBottom(196, 300, 100)).toBe(true);
  });

  it("stops following just past the threshold", () => {
    expect(isAtBottom(195, 300, 100)).toBe(false);
  });

  it("stops following once scrolled well away from the bottom", () => {
    expect(isAtBottom(0, 300, 100)).toBe(false);
  });
});
