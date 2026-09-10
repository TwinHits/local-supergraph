import {
  readDisabledSubgraphs,
  readOverrides,
  settings,
  writeDisabledSubgraphs,
  writeOverrides,
} from "@/main/services/settings/settings.service";
import {
  type DisabledSubgraphs,
  type Override,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";

/** Everything the developer touches per subgraph, for the current variant. */
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
  disabledSubgraphs(): DisabledSubgraphs {
    return readDisabledSubgraphs(settings.currentVariant());
  },
  setSubgraphEnabled(name: string, enabled: boolean): DisabledSubgraphs {
    const variant = settings.currentVariant();
    const withoutName = readDisabledSubgraphs(variant).filter(
      function isOther(each) {
        return each !== name;
      }
    );
    const next = enabled ? withoutName : [...withoutName, name];
    writeDisabledSubgraphs(variant, next);
    return next;
  },
};
