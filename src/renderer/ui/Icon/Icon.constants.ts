import ChevronLeftGlyph from "@mui/icons-material/ChevronLeft";
import ChevronRightGlyph from "@mui/icons-material/ChevronRight";
import ContentCopyGlyph from "@mui/icons-material/ContentCopy";
import SettingsGlyph from "@mui/icons-material/Settings";
import { type ComponentType } from "react";

import { IconName } from "@/renderer/ui/Icon/Icon.types";

export type Glyph = ComponentType<{ fontSize: "inherit" }>;

/**
 * The only place an icon library is named. Switching libraries is a change to
 * the right-hand side of this map and nothing else.
 */
export const GLYPHS: Record<IconName, Glyph> = {
  [IconName.Back]: ChevronLeftGlyph,
  [IconName.Forward]: ChevronRightGlyph,
  [IconName.Copy]: ContentCopyGlyph,
  [IconName.Settings]: SettingsGlyph,
};
