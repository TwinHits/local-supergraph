import { existsSync } from "node:fs";

import {
  ENV_FILE,
  EnvironmentVariable,
} from "@/main/services/environment/environment.constants";
import { type EnvironmentContract } from "@/shared/environment/environment.contract";

let loaded = false;

/** Reads .env into process.env once, so every later read is a plain lookup. */
function load(): void {
  if (loaded) {
    return;
  }
  loaded = true;
  if (existsSync(ENV_FILE)) {
    process.loadEnvFile(ENV_FILE);
  }
}

function read(key: EnvironmentVariable): string {
  load();
  return process.env[key] ?? "";
}

function graphRefParts(): string[] {
  return read(EnvironmentVariable.ApolloGraphRef).split("@");
}

export const environment = {
  graphRef(): string {
    return read(EnvironmentVariable.ApolloGraphRef);
  },
  graphName(): string {
    return graphRefParts()[0] ?? "";
  },

  apolloKey(): string {
    return read(EnvironmentVariable.ApolloKey);
  },
  variants(): string[] {
    return read(EnvironmentVariable.SupergraphVariants)
      .split(",")
      .map(function trim(name) {
        return name.trim();
      })
      .filter(function present(name) {
        return name !== "";
      });
  },
  childEnv(): NodeJS.ProcessEnv {
    load();
    return {
      ...process.env,
      [EnvironmentVariable.ApolloElv2License]: "accept",
      [EnvironmentVariable.ApolloRoverSkipUpdate]: "1",
      [EnvironmentVariable.ApolloTelemetryDisabled]: "1",
    };
  },
};

export const environmentContract: EnvironmentContract = {
  graphName() {
    return environment.graphName();
  },
  variants() {
    return environment.variants();
  },
};
