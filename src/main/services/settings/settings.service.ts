import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { environment } from "@/main/services/environment/environment.service";
import {
  DEFAULT_SETTINGS,
  LOCAL_HOST,
} from "@/shared/settings/settings.constants";
import { type SettingsContract } from "@/shared/settings/settings.contract";
import { type Settings } from "@/shared/settings/settings.types";
import {
  type DisabledSubgraphs,
  type Override,
  type OverrideMap,
} from "@/shared/subgraph/subgraph.types";

type PersistedConfig = {
  settings: Settings;
  currentVariant: string;
  subgraphOverrides: Record<string, OverrideMap>;
  disabledSubgraphs: Record<string, DisabledSubgraphs>;
};

let configFilePath: string | null = null;
let loaded = false;
let doc: PersistedConfig = {
  settings: { ...DEFAULT_SETTINGS },
  currentVariant: "",
  subgraphOverrides: {},
  disabledSubgraphs: {},
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
    disabledSubgraphs: saved.disabledSubgraphs ?? {},
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

/** The subgraphs disabled for one variant. */
export function readDisabledSubgraphs(variant: string): DisabledSubgraphs {
  load();
  return doc.disabledSubgraphs[variant] ?? [];
}

/** Replaces the disabled subgraphs saved for one variant. */
export function writeDisabledSubgraphs(
  variant: string,
  disabled: DisabledSubgraphs
): void {
  load();
  doc.disabledSubgraphs = { ...doc.disabledSubgraphs, [variant]: disabled };
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

/** The overrides saved for the current variant. */
export function currentOverrides(): OverrideMap {
  return readOverrides(settings.currentVariant());
}

/** Changes one subgraph's override for the current variant. */
export function updateCurrentOverride(
  name: string,
  override: Override
): OverrideMap {
  const variant = settings.currentVariant();
  const next = { ...readOverrides(variant), [name]: override };
  writeOverrides(variant, next);
  return next;
}

/** The subgraphs disabled for the current variant. */
export function currentDisabledSubgraphs(): DisabledSubgraphs {
  return readDisabledSubgraphs(settings.currentVariant());
}

/** Enables or disables one subgraph for the current variant. */
export function setSubgraphEnabled(
  name: string,
  enabled: boolean
): DisabledSubgraphs {
  const variant = settings.currentVariant();
  const withoutName = readDisabledSubgraphs(variant).filter(
    function isOther(each) {
      return each !== name;
    }
  );
  const next = enabled ? withoutName : [...withoutName, name];
  writeDisabledSubgraphs(variant, next);
  return next;
}
