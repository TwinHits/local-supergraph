import { type Settings } from "@/shared/settings/settings.types";

/** What the renderer may read and change in settings (§4.1a). */
export type SettingsContract = {
  read(): Settings;
  update(patch: Partial<Settings>): Settings;
  routerAddress(): string;
  localAddress(port: number | null): string;
};
