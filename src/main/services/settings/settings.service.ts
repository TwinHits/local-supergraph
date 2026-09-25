import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

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
  variantFilter: string[];
  currentEnvironment: string;
  subgraphOverrides: Record<string, OverrideMap>;
  disabledSubgraphs: Record<string, DisabledSubgraphs>;
  onboardingCompletedVersion: string | null;
};

let configFilePath: string | null = null;
let loaded = false;
let doc: PersistedConfig = {
  settings: { ...DEFAULT_SETTINGS },
  currentVariant: "",
  variantFilter: [],
  currentEnvironment: "",
  subgraphOverrides: {},
  disabledSubgraphs: {},
  onboardingCompletedVersion: null,
};

/** Gives the service the file its settings are read from and written to. */
export function registerConfigFile(path: string): void {
  configFilePath = path;
}

/**
 * Reads the persisted config file into memory once, if it hasn't been already.
 * @throws {SyntaxError} if the persisted config file contains invalid JSON.
 */
function load(): void {
  if (loaded) {
    return;
  }
  // Not yet registered — try again on the next call instead of marking
  // `loaded` now, which would lock this in on the empty default forever.
  if (configFilePath === null) {
    return;
  }
  loaded = true;
  if (!existsSync(configFilePath)) {
    return;
  }
  // Trusted because this service is the file's only writer.
  const saved = JSON.parse(
    readFileSync(configFilePath, "utf8")
  ) as Partial<PersistedConfig>;
  doc = {
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    currentVariant: saved.currentVariant ?? "",
    variantFilter: saved.variantFilter ?? [],
    currentEnvironment: saved.currentEnvironment ?? "",
    subgraphOverrides: saved.subgraphOverrides ?? {},
    disabledSubgraphs: saved.disabledSubgraphs ?? {},
    onboardingCompletedVersion: saved.onboardingCompletedVersion ?? null,
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

/** The app version the setup wizard was last finished on, or null if it never was. */
export function readOnboardingCompletedVersion(): string | null {
  load();
  return doc.onboardingCompletedVersion;
}

/** Records that the setup wizard was finished on this app version. */
export function markOnboardingCompleted(version: string): void {
  load();
  doc.onboardingCompletedVersion = version;
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
  /**
   * The variant every other service reads. Self-heals against the filter
   * only — with no filter set (the "all variants" case), there's no local
   * list to validate against, so the renderer reconciles that case itself
   * once it has fetched Apollo's actual variant list.
   */
  currentVariant() {
    load();
    if (
      doc.variantFilter.length > 0 &&
      !doc.variantFilter.includes(doc.currentVariant)
    ) {
      doc.currentVariant = doc.variantFilter[0];
    }
    return doc.currentVariant;
  },
  updateVariant(name: string) {
    load();
    doc.currentVariant = name;
    persist();
    return doc.currentVariant;
  },
  variantFilter() {
    load();
    return doc.variantFilter;
  },
  updateVariantFilter(names: string[]) {
    load();
    doc.variantFilter = names;
    persist();
    return doc.variantFilter;
  },
  /** The environment last selected in the toolbar. */
  currentEnvironment() {
    load();
    return doc.currentEnvironment;
  },
  /** Persists the toolbar's newly selected environment. */
  updateEnvironment(name: string) {
    load();
    doc.currentEnvironment = name;
    persist();
    return doc.currentEnvironment;
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
