/* v8 ignore file -- the IPC boundary holds no logic to assert */
import { ipcMain } from "electron";

import { errors } from "@/main/services/errors/errors.service";
import { settings } from "@/main/services/settings/settings.service";
import { subgraph } from "@/main/services/subgraph/subgraph.service";
import { windowControls } from "@/main/services/window/window.service";
import { channelName } from "@/shared/contract/contract.constants";
import { type Contract, type Handlers } from "@/shared/contract/contract.types";

const handlers = {
  errors,
  settings,
  subgraph,
  windowControls,
} satisfies Contract;

/** Registers one IPC handler per contract method. */
export function registerBridge(): void {
  register(handlers);
}

/** Walks the handlers and puts each one on its channel. */
function register(implementations: Handlers): void {
  for (const [namespace, methods] of Object.entries(implementations)) {
    for (const [method, implementation] of Object.entries(methods)) {
      ipcMain.handle(
        channelName(namespace, method),
        function handle(_event, ...args: unknown[]) {
          // IPC gives us untyped arguments. The cast holds because the only
          // caller is the renderer's api, typed from this same Contract.
          return (implementation as (...called: unknown[]) => unknown)(...args);
        }
      );
    }
  }
}
