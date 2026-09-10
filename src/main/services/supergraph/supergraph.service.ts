import { apollo } from "@/main/services/apollo/apollo.service";
import { environment } from "@/main/services/environment/environment.service";
import {
  roverDevState,
  startRoverDev,
  stopRoverDev,
} from "@/main/services/rover/rover.service";
import { settings } from "@/main/services/settings/settings.service";
import { subgraphOverrides } from "@/main/services/subgraph-overrides/subgraph-overrides.service";
import { ROVER_LOG_FILE } from "@/main/services/supergraph-config/supergraph-config.constants";
import { writeSupergraphConfig } from "@/main/services/supergraph-config/supergraph-config.service";
import { type Awaitable } from "@/shared/contract/contract.types";
import { type SupergraphContract } from "@/shared/supergraph/supergraph.contract";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

export const supergraph: Awaitable<SupergraphContract> = {
  async start(): Promise<SupergraphState> {
    if (roverDevState() !== SupergraphState.Stopped) {
      return roverDevState();
    }

    const variant = settings.currentVariant();
    const subgraphs = await apollo.listSubgraphs();
    const configFilePath = writeSupergraphConfig(
      variant,
      subgraphs,
      subgraphOverrides.overrides()
    );

    return startRoverDev(
      `${environment.graphName()}@${variant}`,
      configFilePath,
      settings.read().routerPort,
      ROVER_LOG_FILE
    );
  },

  async stop(): Promise<SupergraphState> {
    return stopRoverDev();
  },

  status(): SupergraphState {
    return roverDevState();
  },
};
