import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import { DEFAULT_SETTINGS } from "@/shared/settings/settings.constants";
import { type Settings } from "@/shared/settings/settings.types";

/** Reads settings from main and writes changes straight back. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);

  const load = useCallback(function read() {
    void api.settings.read().then(setSettings);
  }, []);

  useEffect(load, [load]);

  const change = useCallback(function write(patch: Partial<Settings>) {
    void api.settings.update(patch).then(setSettings);
  }, []);

  const show = useCallback(function openSettings() {
    setOpen(true);
  }, []);

  const close = useCallback(function closeSettings() {
    setOpen(false);
  }, []);

  return { settings, open, change, show, close };
}
