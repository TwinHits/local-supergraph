import { type IconName } from "@/renderer/ui/IconGlyph";

/** One tab the rail can switch to. */
export type TabRailItem = {
  id: string;
  icon: IconName;
  label: string;
};
