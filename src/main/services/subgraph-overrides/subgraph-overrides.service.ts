import {
  readOverrides,
  settings,
  writeOverrides,
} from "@/main/services/settings/settings.service";
import {
  type Override,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";

export const subgraphOverrides = {
  overrides(): OverrideMap {
    return readOverrides(settings.currentVariant());
  },
  updateOverride(name: string, override: Override): OverrideMap {
    const variant = settings.currentVariant();
    const next = { ...readOverrides(variant), [name]: override };
    writeOverrides(variant, next);
    return next;
  },
};
