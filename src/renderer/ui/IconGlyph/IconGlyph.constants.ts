import ChevronLeftGlyph from "@mui/icons-material/ChevronLeft";
import ChevronRightGlyph from "@mui/icons-material/ChevronRight";
import CloseGlyph from "@mui/icons-material/Close";
import ContentCopyGlyph from "@mui/icons-material/ContentCopy";
import CropSquareGlyph from "@mui/icons-material/CropSquare";
import FilterNoneGlyph from "@mui/icons-material/FilterNone";
import MinimizeGlyph from "@mui/icons-material/Minimize";
import PlayArrowGlyph from "@mui/icons-material/PlayArrow";
import SettingsGlyph from "@mui/icons-material/Settings";
import StopGlyph from "@mui/icons-material/Stop";
import { type ComponentType } from "react";

import { IconName } from "@/renderer/ui/IconGlyph/IconGlyph.types";

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
  [IconName.Minimize]: MinimizeGlyph,
  [IconName.Maximize]: CropSquareGlyph,
  [IconName.Restore]: FilterNoneGlyph,
  [IconName.Close]: CloseGlyph,
  [IconName.Start]: PlayArrowGlyph,
  [IconName.Stop]: StopGlyph,
};
