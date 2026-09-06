import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import { applyTheme } from "@/renderer/theme";
import { DEFAULT_THEME } from "@/shared/themes/themes.constants";
import { type ThemeName } from "@/shared/themes/themes.types";

/** Paints the page, and tells main so it can repaint the native title bar. */
export function useTheme() {
  const [name, setName] = useState<ThemeName>(DEFAULT_THEME);

  const load = useCallback(function read() {
    void api.theme.read().then(function store(stored) {
      applyTheme(stored);
      setName(stored);
    });
  }, []);

  useEffect(load, [load]);

  const change = useCallback(function write(next: ThemeName) {
    applyTheme(next);
    void api.theme.set(next).then(setName);
  }, []);

  return { name, change };
}
