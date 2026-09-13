import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LogsDrawerState } from "@/renderer/features/LogsDrawer/LogsDrawer.types";
import { useLogsDrawer } from "@/renderer/features/LogsDrawer/useLogsDrawer";

const READ_POLL_MS = 500;

const api = vi.hoisted(() => ({
  read: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    logs: {
      read: (sourceId: string, cursor: unknown) => api.read(sourceId, cursor),
    },
  },
}));

beforeEach(function isolate() {
  api.read
    .mockReset()
    .mockResolvedValue({ lines: [], cursor: null, reset: false });
  vi.useFakeTimers();
});

afterEach(function restoreRealTimers() {
  vi.useRealTimers();
});

describe("the drawer starts hidden and does not poll for logs until it is shown", () => {
  it("starts hidden", () => {
    const { result } = renderHook(() => useLogsDrawer());

    expect(result.current.state).toBe(LogsDrawerState.Hidden);
  });

  it("never reads the log while hidden", async () => {
    renderHook(() => useLogsDrawer());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS * 3);
    });

    expect(api.read).not.toHaveBeenCalled();
  });
});

describe("once shown, the drawer polls for new lines and keeps them", () => {
  it("shows lines from the first poll after notifyLaunched opens it", async () => {
    const { result } = renderHook(() => useLogsDrawer());
    api.read.mockResolvedValue({
      lines: [{ timestamp: null, text: "starting rover dev" }],
      cursor: "10",
      reset: false,
    });

    act(function launch() {
      result.current.notifyLaunched();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    expect(result.current.lines).toEqual(["starting rover dev"]);
  });

  it("appends the next chunk instead of replacing what's shown", async () => {
    const { result } = renderHook(() => useLogsDrawer());
    api.read.mockResolvedValueOnce({
      lines: [{ timestamp: null, text: "first" }],
      cursor: "10",
      reset: false,
    });
    act(function launch() {
      result.current.notifyLaunched();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    api.read.mockResolvedValueOnce({
      lines: [{ timestamp: null, text: "second" }],
      cursor: "20",
      reset: false,
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    expect(result.current.lines).toEqual(["first", "second"]);
  });

  it("a reset chunk replaces the lines instead of appending to them", async () => {
    const { result } = renderHook(() => useLogsDrawer());
    api.read.mockResolvedValueOnce({
      lines: [{ timestamp: null, text: "before the restart" }],
      cursor: "10",
      reset: false,
    });
    act(function launch() {
      result.current.notifyLaunched();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    api.read.mockResolvedValueOnce({
      lines: [{ timestamp: null, text: "after the restart" }],
      cursor: "5",
      reset: true,
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    expect(result.current.lines).toEqual(["after the restart"]);
  });
});

describe("clearing the log empties what's shown without losing the read position", () => {
  it("clear empties the lines", async () => {
    const { result } = renderHook(() => useLogsDrawer());
    api.read.mockResolvedValueOnce({
      lines: [{ timestamp: null, text: "one" }],
      cursor: "10",
      reset: false,
    });
    act(function launch() {
      result.current.notifyLaunched();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    act(function clearLines() {
      result.current.clear();
    });

    expect(result.current.lines).toEqual([]);
  });

  it("keeps polling from where it left off, not from the start", async () => {
    const { result } = renderHook(() => useLogsDrawer());
    api.read.mockResolvedValueOnce({
      lines: [{ timestamp: null, text: "one" }],
      cursor: "10",
      reset: false,
    });
    act(function launch() {
      result.current.notifyLaunched();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    act(function clearLines() {
      result.current.clear();
    });
    api.read.mockClear();
    api.read.mockResolvedValueOnce({ lines: [], cursor: "10", reset: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_POLL_MS);
    });

    expect(api.read).toHaveBeenCalledWith("rover", "10");
  });
});

describe("minimize, maximize, and restore set the drawer's size directly", () => {
  it("minimize shows the skinny bar", () => {
    const { result } = renderHook(() => useLogsDrawer());

    act(function minimizeDrawer() {
      result.current.minimize();
    });

    expect(result.current.state).toBe(LogsDrawerState.Minimized);
  });

  it("maximize fills from the toolbar down", () => {
    const { result } = renderHook(() => useLogsDrawer());

    act(function maximizeDrawer() {
      result.current.maximize();
    });

    expect(result.current.state).toBe(LogsDrawerState.Maximized);
  });

  it("restore returns to the partial-height drawer", () => {
    const { result } = renderHook(() => useLogsDrawer());

    act(function restoreDrawer() {
      result.current.restore();
    });

    expect(result.current.state).toBe(LogsDrawerState.Open);
  });
});
