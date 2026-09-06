/* v8 ignore file -- runs only inside Electron's preload context */
import { contextBridge, ipcRenderer } from "electron";

import { BRIDGE_KEY, CHANNELS } from "@/shared/contract/contract.constants";
import { type Calls } from "@/shared/contract/contract.types";

const bridge: Calls = {};

for (const channel of CHANNELS) {
  const [namespace, method] = channel.split(".");
  bridge[namespace] ??= {};
  bridge[namespace][method] = function invoke(...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  };
}

contextBridge.exposeInMainWorld(BRIDGE_KEY, bridge);
