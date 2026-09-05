/* v8 ignore file -- runs only inside Electron's preload context */
import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel, type SystemVersions } from "@/models";

/** Asks main for the runtime versions. */
function versions(): Promise<SystemVersions> {
  return ipcRenderer.invoke(IpcChannel.SystemVersions);
}

contextBridge.exposeInMainWorld("system", { versions });
