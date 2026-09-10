import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { environment } from "@/main/services/environment/environment.service";
import {
  DEFAULT_SETTINGS,
  LOCAL_HOST,
} from "@/shared/settings/settings.constants";
import { type SettingsContract } from "@/shared/settings/settings.contract";
import { type Settings } from "@/shared/settings/settings.types";
import { type OverrideMap } from "@/shared/subgraph/subgraph.types";

type PersistedConfig = {
  settings: Settings;
  currentVariant: string;
  subgraphOverrides: Record<string, OverrideMap>;
};

let configFilePath: string | null = null;
let loaded = false;
let doc: PersistedConfig = {
  settings: { ...DEFAULT_SETTINGS },
  currentVariant: "",
  subgraphOverrides: {},
};

/** Gives the service the file its settings are read from and written to. */
export function registerConfigFile(path: string): void {
  configFilePath = path;
}

function load(): void {
  if (loaded) {
    return;
  }
  loaded = true;
  if (configFilePath === null || !existsSync(configFilePath)) {
    return;
  }
  // Trusted because this service is the file's only writer.
  const saved = JSON.parse(
    readFileSync(configFilePath, "utf8")
  ) as Partial<PersistedConfig>;
  doc = {
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    currentVariant: saved.currentVariant ?? "",
    subgraphOverrides: saved.subgraphOverrides ?? {},
  };
}

function persist(): void {
  if (configFilePath === null) {
    return;
  }
  mkdirSync(dirname(configFilePath), { recursive: true });
  writeFileSync(configFilePath, JSON.stringify(doc, null, 2));
}

/** The overrides saved for one variant. */
export function readOverrides(variant: string): OverrideMap {
  load();
  return doc.subgraphOverrides[variant] ?? {};
}

/** Replaces the overrides saved for one variant. */
export function writeOverrides(variant: string, overrides: OverrideMap): void {
  load();
  doc.subgraphOverrides = { ...doc.subgraphOverrides, [variant]: overrides };
  persist();
}

export const settings: SettingsContract = {
  read() {
    load();
    return doc.settings;
  },
  update(patch: Partial<Settings>) {
    load();
    doc.settings = { ...doc.settings, ...patch };
    persist();
    return doc.settings;
  },
  /** The variant every other service reads, defaulting to the first offered. */
  currentVariant() {
    load();
    if (!environment.variants().includes(doc.currentVariant)) {
      doc.currentVariant = environment.variants()[0] ?? "";
    }
    return doc.currentVariant;
  },
  updateVariant(name: string) {
    load();
    doc.currentVariant = name;
    persist();
    return doc.currentVariant;
  },
  routerAddress() {
    load();
    return `http://${LOCAL_HOST}:${doc.settings.routerPort}`;
  },
  localAddress(port: number | null) {
    if (port === null) {
      return `${LOCAL_HOST}:`;
    }
    return `${LOCAL_HOST}:${port}`;
  },
};
