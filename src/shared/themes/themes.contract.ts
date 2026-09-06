import { type ThemeName } from "@/shared/themes/themes.types";

/** The renderer picks a theme; main repaints the native title bar to match. */
export type ThemeContract = {
  read(): ThemeName;
  set(name: ThemeName): ThemeName;
};
