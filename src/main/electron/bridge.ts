/* v8 ignore file -- the IPC boundary has no logic to test */
import { ipcMain } from "electron";

import { apollo } from "@/main/services/apollo/apollo.service";
import { clipboard } from "@/main/services/clipboard/clipboard.service";
import { databases } from "@/main/services/databases/databases.service";
import { environmentContract as environment } from "@/main/services/environment/environment.service";
import { errors } from "@/main/services/errors/errors.service";
import { logs } from "@/main/services/logs/logs.service";
import { onboarding } from "@/main/services/onboarding/onboarding.service";
import {
  setSubgraphEnabled,
  supergraph,
  updateOverride,
} from "@/main/services/rover/rover.service";
import {
  currentDisabledSubgraphs,
  currentOverrides,
  settings,
} from "@/main/services/settings/settings.service";
import { subgraphHealth } from "@/main/services/subgraph-health/subgraph-health.service";
import { windowControls } from "@/main/services/window/window.service";
import { buildChannelName } from "@/shared/contract/contract.constants";
import {
  type Awaitable,
  type Handlers,
  type Implementation,
} from "@/shared/contract/contract.types";
import { type SubgraphContract } from "@/shared/subgraph/subgraph.contract";

const subgraph: Awaitable<SubgraphContract> = {
  overrides: currentOverrides,
  updateOverride,
  checkHealth: subgraphHealth.checkHealth,
  disabledSubgraphs: currentDisabledSubgraphs,
  setSubgraphEnabled,
};

const handlers = {
  apollo,
  clipboard,
  databases,
  environment,
  errors,
  logs,
  onboarding,
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
