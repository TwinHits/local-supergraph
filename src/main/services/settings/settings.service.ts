import { environment } from "@/main/services/environment/environment.service";
import {
  DEFAULT_SETTINGS,
  LOCAL_HOST,
} from "@/shared/settings/settings.constants";
import { type SettingsContract } from "@/shared/settings/settings.contract";
import { type Settings } from "@/shared/settings/settings.types";

const current: Settings = { ...DEFAULT_SETTINGS };

let variant = "";

export const settings: SettingsContract = {
  read() {
    return current;
  },
  update(patch: Partial<Settings>) {
    Object.assign(current, patch);
    return current;
  },
  /** The variant every other service reads. Defaults to the first offered. */
  currentVariant() {
    if (variant === "") {
      variant = environment.variants()[0] ?? "";
    }
    return variant;
  },
  selectVariant(name: string) {
    variant = name;
    return variant;
  },
  routerAddress() {
    return `http://${LOCAL_HOST}:${current.routerPort}`;
  },
  localAddress(port: number | null) {
    if (port === null) {
      return `${LOCAL_HOST}:`;
    }
    return `${LOCAL_HOST}:${port}`;
  },
};
