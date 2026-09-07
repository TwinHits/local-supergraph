/* v8 ignore file -- the IPC boundary holds no logic to assert */
import { ipcMain } from "electron";

import { apollo } from "@/main/services/apollo/apollo.service";
import { environmentContract as environment } from "@/main/services/environment/environment.service";
import { errors } from "@/main/services/errors/errors.service";
import { settings } from "@/main/services/settings/settings.service";
import { subgraphHealth } from "@/main/services/subgraph-health/subgraph-health.service";
import { subgraphOverrides } from "@/main/services/subgraph-overrides/subgraph-overrides.service";
import { windowControls } from "@/main/services/window/window.service";
import { channelName } from "@/shared/contract/contract.constants";
import {
  type Handlers,
  type Implementation,
} from "@/shared/contract/contract.types";
import { type SubgraphContract } from "@/shared/subgraph/subgraph.contract";

const subgraph: SubgraphContract = {
  overrides: subgraphOverrides.overrides,
  setOverride: subgraphOverrides.setOverride,
  health: subgraphHealth.health,
};

const handlers = {
  apollo,
  environment,
  errors,
  settings,
  subgraph,
  windowControls,
} satisfies Implementation;

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
