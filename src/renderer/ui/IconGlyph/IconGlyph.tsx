import { GLYPHS } from "@/renderer/ui/IconGlyph/IconGlyph.constants";
import { type IconName } from "@/renderer/ui/IconGlyph/IconGlyph.types";

type IconGlyphProps = {
  name: IconName;
};

/** One icon. */
export default function IconGlyph({ name }: IconGlyphProps) {
  const Glyph = GLYPHS[name];
  return <Glyph fontSize="inherit" />;
}
