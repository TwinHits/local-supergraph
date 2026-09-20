import {
  GLYPHS,
  ICON_SIZE_REM,
} from "@/renderer/ui/IconGlyph/IconGlyph.constants";
import {
  type IconName,
  type IconSize,
} from "@/renderer/ui/IconGlyph/IconGlyph.types";

type IconGlyphProps = {
  name: IconName;
  size: IconSize;
};

/** One icon, at an explicit size rather than whatever text size surrounds it. */
export default function IconGlyph({ name, size }: IconGlyphProps) {
  const Glyph = GLYPHS[name];
  return <Glyph style={{ fontSize: ICON_SIZE_REM[size] }} />;
}
