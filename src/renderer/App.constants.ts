import { AppTab, type TabDetails } from "@/renderer/App.types";
import { IconName } from "@/renderer/ui/IconGlyph";
import { type TabRailItem } from "@/renderer/ui/TabRail";

export const TAB_DETAILS: Record<AppTab, TabDetails> = {
  [AppTab.Supergraph]: { icon: IconName.Supergraph, label: "Supergraph" },
  [AppTab.Databases]: { icon: IconName.Database, label: "Databases" },
};

export const TAB_ITEMS: TabRailItem[] = Object.values(AppTab).map(
  function toItem(tab) {
    return { id: tab, ...TAB_DETAILS[tab] };
  }
);
