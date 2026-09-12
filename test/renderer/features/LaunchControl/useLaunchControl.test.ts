import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLaunchControl } from "@/renderer/features/LaunchControl/useLaunchControl";

const api = vi.hoisted(() => ({
  status: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  routerAddress: vi.fn(),
  openExternal: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    supergraph: {
      status: () => api.status(),
      start: () => api.start(),
      stop: () => api.stop(),
    },
    settings: {
      routerAddress: () => api.routerAddress(),
    },
    windowControls: {
      openExternal: (url: string) => api.openExternal(url),
    },
  },
}));

beforeEach(function isolate() {
  api.status.mockReset().mockResolvedValue("stopped");
  api.start.mockReset().mockResolvedValue("starting");
  api.stop.mockReset().mockResolvedValue("stopped");
  api.routerAddress.mockReset().mockResolvedValue("http://localhost:4041");
  api.openExternal.mockReset().mockResolvedValue(undefined);
  vi.useFakeTimers();
});

afterEach(function restoreRealTimers() {
  vi.useRealTimers();
});

describe("the launch control's state always reflects what main actually reports, not a local guess", () => {
  it("starts stopped, before the first poll", () => {
    const { result } = renderHook(() => useLaunchControl());

    expect(result.current.state).toBe("stopped");
  });

  it("picks up a state change from main even when nothing here triggered it", async () => {
    const { result } = renderHook(() => useLaunchControl());
    api.status.mockResolvedValue("starting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.state).toBe("starting");
  });

  it("keeps polling and reflects the next change too, like a restart finishing", async () => {
    const { result } = renderHook(() => useLaunchControl());
    api.status.mockResolvedValue("starting");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.state).toBe("starting");

    api.status.mockResolvedValue("running");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.state).toBe("running");
  });
});

describe("start and stop call the bridge and adopt whatever state comes back", () => {
  it("start calls the bridge and adopts what it returns", async () => {
    api.start.mockResolvedValue("starting");
    const { result } = renderHook(() => useLaunchControl());

    await act(async () => {
      result.current.start();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(api.start).toHaveBeenCalledOnce();
    expect(result.current.state).toBe("starting");
  });

  it("stop calls the bridge and adopts what it returns", async () => {
    api.status.mockResolvedValue("running");
    const { result } = renderHook(() => useLaunchControl());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    api.stop.mockResolvedValue("stopped");

    await act(async () => {
      result.current.stop();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(api.stop).toHaveBeenCalledOnce();
    expect(result.current.state).toBe("stopped");
  });
});

describe("opening the router opens its real address in the system browser", () => {
  it("reads the router address, then opens it externally", async () => {
    const { result } = renderHook(() => useLaunchControl());

    await act(async () => {
      result.current.openRouter();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(api.routerAddress).toHaveBeenCalledOnce();
    expect(api.openExternal).toHaveBeenCalledWith("http://localhost:4041");
  });
});
