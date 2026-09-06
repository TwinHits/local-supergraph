import { THEMES, TITLE_BAR_HEIGHT } from "@/shared/themes/themes.constants";
import { type ThemeName } from "@/shared/themes/themes.types";

/** Publishes a theme as CSS variables, so stylesheets and main share values. */
export function applyTheme(name: ThemeName): void {
  const theme = THEMES[name];
  const root = document.documentElement.style;
  root.setProperty("--title-bar-background", theme.titleBarBackground);
  root.setProperty("--title-bar-border", theme.titleBarBorder);
  root.setProperty("--title-bar-height", `${TITLE_BAR_HEIGHT}px`);
}
