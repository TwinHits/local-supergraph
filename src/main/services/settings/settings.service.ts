import { DEFAULT_SETTINGS } from "@/shared/settings/settings.constants";
import { type SettingsContract } from "@/shared/settings/settings.contract";
import { type Settings } from "@/shared/settings/settings.types";

const current: Settings = { ...DEFAULT_SETTINGS };

export const settings: SettingsContract = {
  read() {
    return current;
  },
  update(patch: Partial<Settings>) {
    Object.assign(current, patch);
    return current;
  },
};
