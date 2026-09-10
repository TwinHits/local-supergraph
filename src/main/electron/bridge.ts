/* v8 ignore file -- the IPC boundary has no logic to test */
import { ipcMain } from "electron";

import { apollo } from "@/main/services/apollo/apollo.service";
import { environmentContract as environment } from "@/main/services/environment/environment.service";
import { errors } from "@/main/services/errors/errors.service";
import { settings } from "@/main/services/settings/settings.service";
import { subgraphHealth } from "@/main/services/subgraph-health/subgraph-health.service";
import { subgraphOverrides } from "@/main/services/subgraph-overrides/subgraph-overrides.service";
import { supergraph } from "@/main/services/supergraph/supergraph.service";
import { windowControls } from "@/main/services/window/window.service";
import { buildChannelName } from "@/shared/contract/contract.constants";
import {
  type Awaitable,
  type Handlers,
  type Implementation,
} from "@/shared/contract/contract.types";
import { type SubgraphContract } from "@/shared/subgraph/subgraph.contract";

const subgraph: Awaitable<SubgraphContract> = {
  overrides: subgraphOverrides.overrides,
  updateOverride: subgraphOverrides.updateOverride,
  checkHealth: subgraphHealth.checkHealth,
};

const handlers = {
  apollo,
  environment,
  errors,
  settings,
  subgraph,
  supergraph,
  windowControls,
} satisfies Implementation;

/** Registers one IPC handler per contract method. */
export function registerBridge(): void {
  registerHandlers(handlers);
}

/** Puts each handler on its channel. */
function registerHandlers(implementations: Handlers): void {
  for (const [namespace, methods] of Object.entries(implementations)) {
    for (const [method, implementation] of Object.entries(methods)) {
      ipcMain.handle(
        buildChannelName(namespace, method),
        function handle(_event, ...args: unknown[]) {
          // The cast holds because the only caller is the renderer's api,
          // built from this same Contract.
          return (implementation as (...called: unknown[]) => unknown)(...args);
        }
      );
    }
  }
}
