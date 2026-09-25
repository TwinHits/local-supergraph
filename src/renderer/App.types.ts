import { type IconName } from "@/renderer/ui/IconGlyph";

/** The app's tabs, in tab rail order. */
export enum AppTab {
  Supergraph = "supergraph",
  Databases = "databases",
}

/** How a tab is shown wherever it is named. */
export type TabDetails = {
  icon: IconName;
  label: string;
};
