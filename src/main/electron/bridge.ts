/* v8 ignore file -- the IPC boundary holds no logic to assert */
import { ipcMain } from "electron";
import { IpcChannel } from "@/models";
import { systemVersions } from "@/main/services/system";

/** Registers one IPC handler per renderer-visible service method. */
export function registerBridge(): void {
  ipcMain.handle(IpcChannel.SystemVersions, systemVersions);
}
