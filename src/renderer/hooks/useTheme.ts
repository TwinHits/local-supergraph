import { useCallback, useState } from "react";

import { applyTheme } from "@/renderer/theme";
import { DEFAULT_THEME } from "@/shared/themes/themes.constants";
import { type ThemeName } from "@/shared/themes/themes.types";

/** The theme in force, and how to change it. */
export function useTheme() {
  const [name, setName] = useState<ThemeName>(DEFAULT_THEME);

  const change = useCallback(function write(next: ThemeName) {
    applyTheme(next);
    setName(next);
  }, []);

  return { name, change };
}
