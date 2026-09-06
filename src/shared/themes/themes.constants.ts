import dark from "@/shared/themes/dark.module.scss";
import layout from "@/shared/themes/layout.module.scss";
import light from "@/shared/themes/light.module.scss";
import { type Theme, ThemeName } from "@/shared/themes/themes.types";

/** Names the values a stylesheet exports, once, for both themes. */
function toTheme(exported: Record<string, string>): Theme {
  return {
    titleBarBackground: exported.titleBarBackground,
    titleBarSymbol: exported.titleBarSymbol,
    titleBarBorder: exported.titleBarBorder,
    titleBarHover: exported.titleBarHover,
  };
}

/** Values come from the stylesheets, so a colour is written in one place. */
export const THEMES: Record<ThemeName, Theme> = {
  [ThemeName.Light]: toTheme(light),
  [ThemeName.Dark]: toTheme(dark),
};

export const TITLE_BAR_HEIGHT = Number(layout.titleBarHeight);

export const DEFAULT_THEME = ThemeName.Light;
