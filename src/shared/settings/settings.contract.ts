import { type Settings } from "@/shared/settings/settings.types";

/** What the renderer may read and change in settings. */
export type SettingsContract = {
  read(): Settings;
  update(patch: Partial<Settings>): Settings;
  routerAddress(): string;
  currentVariant(): string;
  updateVariant(name: string): string;
  variantFilter(): string[];
  updateVariantFilter(names: string[]): string[];
  localAddress(port: number | null): string;
};
