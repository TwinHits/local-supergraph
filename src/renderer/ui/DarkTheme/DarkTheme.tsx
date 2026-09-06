import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { type ReactNode } from "react";

import colors from "@/renderer/styles/colors.module.scss";

const THEME = createTheme({
  palette: {
    mode: "dark",
    text: { primary: colors.textPrimary, secondary: colors.textMuted },
  },
});

type DarkThemeProps = {
  children: ReactNode;
};

/** Puts every MUI component into dark mode and paints the page to match. */
export default function DarkTheme({ children }: DarkThemeProps) {
  return (
    <ThemeProvider theme={THEME}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
