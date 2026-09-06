import { type SubgraphContract } from "@/shared/subgraph/subgraph.contract";
import {
  type HealthMap,
  type Override,
  type OverrideMap,
  type Subgraph,
} from "@/shared/subgraph/subgraph.types";

const overrides: OverrideMap = {};

export const subgraph: SubgraphContract = {
  list(): Subgraph[] {
    return [];
  },
  overrides() {
    return overrides;
  },
  setOverride(name: string, override: Override) {
    overrides[name] = override;
    return overrides;
  },
  health(): HealthMap {
    return {};
  },
};
