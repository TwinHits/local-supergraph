import { GLYPHS } from "@/renderer/ui/Icon/Icon.constants";
import { type IconName } from "@/renderer/ui/Icon/Icon.types";

type IconProps = {
  name: IconName;
};

/** Sized by whatever contains it, so it never fights its button. */
export default function Icon({ name }: IconProps) {
  const Glyph = GLYPHS[name];
  return <Glyph fontSize="inherit" />;
}
