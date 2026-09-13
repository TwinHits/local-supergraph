import ArrowLeftGlyph from "@mui/icons-material/ArrowLeft";
import ArrowRightGlyph from "@mui/icons-material/ArrowRight";
import ClearAllGlyph from "@mui/icons-material/ClearAll";
import CloseGlyph from "@mui/icons-material/Close";
import CropSquareGlyph from "@mui/icons-material/CropSquare";
import FilterNoneGlyph from "@mui/icons-material/FilterNone";
import MinimizeGlyph from "@mui/icons-material/Minimize";
import OpenInNewGlyph from "@mui/icons-material/OpenInNew";
import PlayArrowGlyph from "@mui/icons-material/PlayArrow";
import RefreshGlyph from "@mui/icons-material/Refresh";
import SearchGlyph from "@mui/icons-material/Search";
import SettingsGlyph from "@mui/icons-material/Settings";
import StopGlyph from "@mui/icons-material/Stop";
import { type ComponentType } from "react";

import { IconName } from "@/renderer/ui/IconGlyph/IconGlyph.types";

export type Glyph = ComponentType<{ fontSize: "inherit" }>;

/** The only place an icon library is named. */
export const GLYPHS: Record<IconName, Glyph> = {
  [IconName.Back]: ArrowLeftGlyph,
  [IconName.Forward]: ArrowRightGlyph,
  [IconName.Settings]: SettingsGlyph,
  [IconName.Minimize]: MinimizeGlyph,
  [IconName.Maximize]: CropSquareGlyph,
  [IconName.Restore]: FilterNoneGlyph,
  [IconName.Close]: CloseGlyph,
  [IconName.Start]: PlayArrowGlyph,
  [IconName.Stop]: StopGlyph,
  [IconName.Refresh]: RefreshGlyph,
  [IconName.Search]: SearchGlyph,
  [IconName.OpenLink]: OpenInNewGlyph,
  [IconName.Clear]: ClearAllGlyph,
};
