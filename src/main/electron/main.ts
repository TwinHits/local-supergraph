/* v8 ignore file -- window and app lifecycle, only real Electron exercises it */
import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { registerBridge } from "./bridge";

const RENDERER_HTML = join(__dirname, "..", "dist", "index.html");
const PRELOAD_SCRIPT = join(__dirname, "preload.cjs");

/** Opens the single window this app has. */
function createWindow(): void {
  const window = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void window.loadFile(RENDERER_HTML);
}

// Quits on macOS too. One window, and closing it means the developer is done.
function quit(): void {
  app.quit();
}

registerBridge();
void app.whenReady().then(createWindow);
app.on("window-all-closed", quit);
