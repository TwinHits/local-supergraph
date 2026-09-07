/* v8 ignore file -- window and app lifecycle, only real Electron exercises it */
import { join } from "node:path";

import { app, BrowserWindow } from "electron";

import { startServices } from "@/main/services/startup/startup.service";
import { registerWindowActions } from "@/main/services/window/window.service";

import { registerBridge } from "./bridge";

const RENDERER_HTML = join(__dirname, "..", "dist", "index.html");
const PRELOAD_SCRIPT = join(__dirname, "preload.cjs");

/** Opens the single window this app has. */
function createWindow(): void {
  const window = new BrowserWindow({
    width: 1100,
    height: 700,
    frame: false,
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerWindowActions({
    minimize() {
      window.minimize();
    },
    toggleMaximize() {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      return window.isMaximized();
    },
    close() {
      window.close();
    },
    isMaximized() {
      return window.isMaximized();
    },
  });

  void window.loadFile(RENDERER_HTML);
}

function quit(): void {
  app.quit();
}

registerBridge();
startServices();
void app.whenReady().then(createWindow);
app.on("window-all-closed", quit);
