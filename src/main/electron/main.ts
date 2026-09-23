/* v8 ignore file -- only real Electron runs this */
import { join } from "node:path";

import { app, BrowserWindow, clipboard, shell } from "electron";

import {
  registerClipboardReader,
  registerClipboardWriter,
} from "@/main/services/clipboard/clipboard.service";
import { databases } from "@/main/services/databases/databases.service";
import { registerAppVersion } from "@/main/services/onboarding/onboarding.service";
import { supergraph } from "@/main/services/rover/rover.service";
import { registerConfigFile } from "@/main/services/settings/settings.service";
import { startServices } from "@/main/services/startup/startup.service";
import { registerWindowActions } from "@/main/services/window/window.service";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

import { registerBridge } from "./bridge";

const RENDERER_HTML = join(__dirname, "..", "dist", "index.html");
const PRELOAD_SCRIPT = join(__dirname, "preload.cjs");
const DOCK_ICON = join(__dirname, "..", "assets", "logo.png");
const CONFIG_FILE_NAME = "config.json";
// A last resort if stopping rover somehow never resolves, so the app can
// still quit instead of hanging until it's force-killed.
const QUIT_STOP_TIMEOUT_MS = 10000;

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
    openExternal(url) {
      void shell.openExternal(url);
    },
  });

  void window.loadFile(RENDERER_HTML);
}

function quitApp(): void {
  app.quit();
}

let quitting = false;

/** Stops rover and any open database connections before the app quits, so neither outlives the window. */
function stopBackgroundProcessesBeforeQuit(event: Electron.Event): void {
  const supergraphRunning = supergraph.status() !== SupergraphState.Stopped;
  const connectedDatabases = Object.entries(databases.statuses())
    .filter(function isConnected([, row]) {
      return row.state !== DatabaseConnectionState.Disconnected;
    })
    .map(function toName([name]) {
      return name;
    });

  if (quitting || (!supergraphRunning && connectedDatabases.length === 0)) {
    return;
  }
  event.preventDefault();
  quitting = true;

  const stopped = Promise.all([
    supergraphRunning ? Promise.resolve(supergraph.stop()) : Promise.resolve(),
    ...connectedDatabases.map(function disconnectOne(name) {
      return Promise.resolve(databases.disconnect(name));
    }),
  ]);
  const gaveUp = new Promise<void>(function wait(resolve) {
    setTimeout(resolve, QUIT_STOP_TIMEOUT_MS);
  });

  void Promise.race([stopped, gaveUp]).then(function quit() {
    app.quit();
  });
}

registerBridge();
registerClipboardWriter(clipboard.writeText);
registerClipboardReader(clipboard.readText);
void app.whenReady().then(function ready() {
  registerConfigFile(join(app.getPath("userData"), CONFIG_FILE_NAME));
  registerAppVersion(app.getVersion());
  startServices();
  setDockIcon();
  createWindow();
});
app.on("window-all-closed", quitApp);
app.on("before-quit", stopBackgroundProcessesBeforeQuit);
