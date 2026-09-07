import {
  type Override,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";

const overrides: OverrideMap = {};

export const subgraphOverrides = {
  overrides(): OverrideMap {
    return overrides;
  },
  setOverride(name: string, override: Override): OverrideMap {
    overrides[name] = override;
    return overrides;
  },
};
