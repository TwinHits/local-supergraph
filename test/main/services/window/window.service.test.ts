import { expect, test, vi } from "vitest";

import {
  registerWindowActions,
  windowControls,
} from "@/main/services/window/window.service";

test("does nothing before Electron supplies a window", () => {
  expect(windowControls.isMaximized()).toBe(false);
});

test("passes minimize on to the window", () => {
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
  });

  windowControls.minimize();

  expect(minimize).toHaveBeenCalledOnce();
});

test("reports what the window says about being maximized", () => {
  registerWindowActions({
    minimize() {},
    toggleMaximize() {
      return true;
    },
    close() {},
    isMaximized() {
      return true;
    },
  });

  expect(windowControls.toggleMaximize()).toBe(true);
  expect(windowControls.isMaximized()).toBe(true);
});
