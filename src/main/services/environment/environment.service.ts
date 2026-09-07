import { existsSync } from "node:fs";

import {
  ENV_FILE,
  EnvironmentVariable,
} from "@/main/services/environment/environment.constants";
import { type EnvironmentContract } from "@/shared/environment/environment.contract";

let loaded = false;

/** Reads .env into process.env once. */
function loadEnvFile(): void {
  if (loaded) {
    return;
  }
  loaded = true;
  if (existsSync(ENV_FILE)) {
    process.loadEnvFile(ENV_FILE);
  }
}

function readVariable(key: EnvironmentVariable): string {
  loadEnvFile();
  return process.env[key] ?? "";
}

function splitGraphRef(): string[] {
  return readVariable(EnvironmentVariable.ApolloGraphRef).split("@");
}

export const environment = {
  graphRef(): string {
    return readVariable(EnvironmentVariable.ApolloGraphRef);
  },
  graphName(): string {
    return splitGraphRef()[0] ?? "";
  },

  apolloKey(): string {
    return readVariable(EnvironmentVariable.ApolloKey);
  },
  variants(): string[] {
    return readVariable(EnvironmentVariable.SupergraphVariants)
      .split(",")
      .map(function trim(name) {
        return name.trim();
      })
      .filter(function isPresent(name) {
        return name !== "";
      });
  },
  childEnv(): NodeJS.ProcessEnv {
    loadEnvFile();
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
