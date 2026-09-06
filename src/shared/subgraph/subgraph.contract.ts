import {
  type HealthMap,
  type Override,
  type OverrideMap,
  type Subgraph,
} from "@/shared/subgraph/subgraph.types";

/** What the renderer may ask about the graph and its local overrides. */
export type SubgraphContract = {
  list(): Subgraph[];
  overrides(): OverrideMap;
  setOverride(name: string, override: Override): OverrideMap;
  health(): HealthMap;
};
