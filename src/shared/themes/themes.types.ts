export enum ThemeName {
  Light = "light",
  Dark = "dark",
}

/** A theme is colours. Spacing is shared by every theme. */
export type Theme = {
  titleBarBackground: string;
  titleBarSymbol: string;
  titleBarBorder: string;
  titleBarHover: string;
};
