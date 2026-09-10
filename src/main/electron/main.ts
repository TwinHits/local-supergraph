/* v8 ignore file -- only real Electron runs this */
import { join } from "node:path";

import { app, BrowserWindow } from "electron";

import { registerConfigFile } from "@/main/services/settings/settings.service";
import { startServices } from "@/main/services/startup/startup.service";
import { supergraph } from "@/main/services/supergraph/supergraph.service";
import { registerWindowActions } from "@/main/services/window/window.service";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

import { registerBridge } from "./bridge";

const RENDERER_HTML = join(__dirname, "..", "dist", "index.html");
const PRELOAD_SCRIPT = join(__dirname, "preload.cjs");
const DOCK_ICON = join(__dirname, "..", "assets", "logo.png");
const CONFIG_FILE_NAME = "config.json";

/** Sets the Dock icon, where the platform has a Dock. */
function setDockIcon(): void {
  if (app.dock === undefined) {
    return;
  }
  app.dock.setIcon(DOCK_ICON);
}

/** Opens the app's only window. */
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

function quitApp(): void {
  app.quit();
}

let quitting = false;

/** Stops rover before the app quits, so it doesn't keep running after the window closes. */
function stopSupergraphBeforeQuit(event: Electron.Event): void {
  if (quitting || supergraph.status() === SupergraphState.Stopped) {
    return;
  }
  event.preventDefault();
  quitting = true;
  void Promise.resolve(supergraph.stop()).then(function quit() {
    app.quit();
  });
}

registerBridge();
startServices();
void app.whenReady().then(function ready() {
  registerConfigFile(join(app.getPath("userData"), CONFIG_FILE_NAME));
  setDockIcon();
  createWindow();
});
app.on("window-all-closed", quitApp);
app.on("before-quit", stopSupergraphBeforeQuit);
