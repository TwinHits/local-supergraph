/* v8 ignore file -- window and app lifecycle, only real Electron exercises it */
import { join } from "node:path";

import { app, BrowserWindow } from "electron";

import {
  onThemeChange,
  titleBarOverlay,
} from "@/main/services/theme/theme.service";
import { DEFAULT_THEME } from "@/shared/themes/themes.constants";

import { registerBridge } from "./bridge";

const RENDERER_HTML = join(__dirname, "..", "dist", "index.html");
const PRELOAD_SCRIPT = join(__dirname, "preload.cjs");

/** Opens the single window this app has. */
function createWindow(): void {
  const window = new BrowserWindow({
    width: 1100,
    height: 700,
    titleBarStyle: "hidden",
    titleBarOverlay: titleBarOverlay(DEFAULT_THEME),
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  onThemeChange(function repaint(name) {
    window.setTitleBarOverlay(titleBarOverlay(name));
  });

  void window.loadFile(RENDERER_HTML);
}

function quit(): void {
  app.quit();
}

registerBridge();
void app.whenReady().then(createWindow);
app.on("window-all-closed", quit);
