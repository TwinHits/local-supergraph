import { GLYPHS } from "@/renderer/ui/IconGlyph/IconGlyph.constants";
import { type IconName } from "@/renderer/ui/IconGlyph/IconGlyph.types";

type IconGlyphProps = {
  name: IconName;
};

/** Sized by whatever contains it, so it never fights its button. */
export default function IconGlyph({ name }: IconGlyphProps) {
  const Glyph = GLYPHS[name];
  return <Glyph fontSize="inherit" />;
}
