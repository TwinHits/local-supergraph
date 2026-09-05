/* v8 ignore file -- the IPC boundary holds no logic to assert */
import { ipcMain } from "electron";
import { type Contract, type Handlers } from "@/shared/contract/contract.types";
import { channelName } from "@/shared/contract/contract.constants";
import { system } from "@/main/services/system";

const handlers = { system } satisfies Contract;

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
          return implementation(...args);
        }
      );
    }
  }
}
