import {
  DEFAULT_THEME,
  THEMES,
  TITLE_BAR_HEIGHT,
} from "@/shared/themes/themes.constants";
import { type ThemeContract } from "@/shared/themes/themes.contract";
import { type ThemeName } from "@/shared/themes/themes.types";

type Listener = (name: ThemeName) => void;

/** The window options a theme implies. Built here so main.ts holds no colours. */
export type TitleBarOverlay = {
  color: string;
  symbolColor: string;
  height: number;
};

export function titleBarOverlay(name: ThemeName): TitleBarOverlay {
  return {
    color: THEMES[name].titleBarBackground,
    symbolColor: THEMES[name].titleBarSymbol,
    height: TITLE_BAR_HEIGHT,
  };
}

let current: ThemeName = DEFAULT_THEME;
const listeners: Listener[] = [];

/** Lets the Electron layer repaint the window when the theme changes. */
export function onThemeChange(listener: Listener): void {
  listeners.push(listener);
}

export const theme: ThemeContract = {
  read() {
    return current;
  },
  set(name: ThemeName) {
    current = name;
    for (const listener of listeners) {
      listener(name);
    }
    return current;
  },
};
