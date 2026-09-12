import { describe, expect, it, vi } from "vitest";

import {
  registerWindowActions,
  windowControls,
} from "@/main/services/window/window.service";

describe("window actions are injected, so they're safe to call before Electron supplies a real window", () => {
  it("does nothing before Electron supplies a window", () => {
    expect(windowControls.isMaximized()).toBe(false);
  });

  it("passes minimize on to the window", () => {
    const minimize = vi.fn();
    registerWindowActions({
      minimize,
      toggleMaximize() {
        return false;
      },
      close() {},
      isMaximized() {
        return false;
      },
      openExternal() {},
    });

    windowControls.minimize();

    expect(minimize).toHaveBeenCalledOnce();
  });

  it("reports what the window says about being maximized", () => {
    registerWindowActions({
      minimize() {},
      toggleMaximize() {
        return true;
      },
      close() {},
      isMaximized() {
        return true;
      },
      openExternal() {},
    });

    expect(windowControls.toggleMaximize()).toBe(true);
    expect(windowControls.isMaximized()).toBe(true);
  });
});
