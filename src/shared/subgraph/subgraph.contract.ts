import {
  type HealthMap,
  type Override,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";

/** What the renderer may ask about the subgraphs and their local overrides. */
export type SubgraphContract = {
  overrides(): OverrideMap;
  updateOverride(name: string, override: Override): OverrideMap;
  checkHealth(): HealthMap;
};
