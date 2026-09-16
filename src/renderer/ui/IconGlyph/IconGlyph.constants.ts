import AccountTreeGlyph from "@mui/icons-material/AccountTree";
import ArrowLeftGlyph from "@mui/icons-material/ArrowLeft";
import ArrowRightGlyph from "@mui/icons-material/ArrowRight";
import ChevronLeftGlyph from "@mui/icons-material/ChevronLeft";
import ChevronRightGlyph from "@mui/icons-material/ChevronRight";
import ClearAllGlyph from "@mui/icons-material/ClearAll";
import CloseGlyph from "@mui/icons-material/Close";
import ContentCopyGlyph from "@mui/icons-material/ContentCopy";
import FullscreenGlyph from "@mui/icons-material/Fullscreen";
import FullscreenExitGlyph from "@mui/icons-material/FullscreenExit";
import MinimizeGlyph from "@mui/icons-material/Minimize";
import OpenInNewGlyph from "@mui/icons-material/OpenInNew";
import PlayArrowGlyph from "@mui/icons-material/PlayArrow";
import RefreshGlyph from "@mui/icons-material/Refresh";
import SearchGlyph from "@mui/icons-material/Search";
import SettingsGlyph from "@mui/icons-material/Settings";
import StopGlyph from "@mui/icons-material/Stop";
import StorageGlyph from "@mui/icons-material/Storage";
import { type ComponentType } from "react";

import { IconName } from "@/renderer/ui/IconGlyph/IconGlyph.types";

export type Glyph = ComponentType<{ fontSize: "inherit" }>;

/** The only place an icon library is named. */
export const GLYPHS: Record<IconName, Glyph> = {
  [IconName.Back]: ArrowLeftGlyph,
  [IconName.Forward]: ArrowRightGlyph,
  [IconName.Settings]: SettingsGlyph,
  [IconName.Minimize]: MinimizeGlyph,
  [IconName.Maximize]: FullscreenGlyph,
  [IconName.Restore]: FullscreenExitGlyph,
  [IconName.Close]: CloseGlyph,
  [IconName.Start]: PlayArrowGlyph,
  [IconName.Stop]: StopGlyph,
  [IconName.Refresh]: RefreshGlyph,
  [IconName.Search]: SearchGlyph,
  [IconName.OpenLink]: OpenInNewGlyph,
  [IconName.Clear]: ClearAllGlyph,
  [IconName.Copy]: ContentCopyGlyph,
  [IconName.CollapseRail]: ChevronLeftGlyph,
  [IconName.ExpandRail]: ChevronRightGlyph,
  [IconName.Supergraph]: AccountTreeGlyph,
  [IconName.Database]: StorageGlyph,
};
