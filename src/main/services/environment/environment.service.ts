import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
  DEFAULT_AWS_REGION,
  ENV_FILE,
  EnvironmentVariable,
} from "@/main/services/environment/environment.constants";
import { type EnvironmentValues } from "@/main/services/environment/environment.types";
import { mergeEnvContents } from "@/main/services/environment/environment.utils";
import { type EnvironmentContract } from "@/shared/environment/environment.contract";
import { GRAPH_REF_SEPARATOR } from "@/shared/onboarding/onboarding.constants";

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

/** Reads one environment variable, falling back to `defaultValue` when it's unset. */
function readVariable(key: EnvironmentVariable, defaultValue = ""): string {
  loadEnvFile();
  return process.env[key] ?? defaultValue;
}

function splitGraphRef(): string[] {
  return readVariable(EnvironmentVariable.ApolloGraphRef).split(
    GRAPH_REF_SEPARATOR
  );
}

function baseChildEnv(): NodeJS.ProcessEnv {
  loadEnvFile();
  return {
    ...process.env,
    [EnvironmentVariable.ApolloElv2License]: "accept",
    [EnvironmentVariable.ApolloRoverSkipUpdate]: "1",
    [EnvironmentVariable.ApolloTelemetryDisabled]: "1",
  };
}

export const environment = {
  graphName(): string {
    return splitGraphRef()[0] ?? "";
  },
  /** The variant named in APOLLO_GRAPH_REF, after the graph name. */
  graphVariant(): string {
    return splitGraphRef()[1] ?? "";
  },

  apolloKey(): string {
    return readVariable(EnvironmentVariable.ApolloKey);
  },
  /** The AWS region for AWS CLI calls, defaulting to DEFAULT_AWS_REGION when unset. */
  awsRegion(): string {
    return readVariable(EnvironmentVariable.AwsRegion, DEFAULT_AWS_REGION);
  },
  childEnv(): NodeJS.ProcessEnv {
    return baseChildEnv();
  },
  /** Whether the Apollo key, graph name and variant are all set. */
  isConfigured(): boolean {
    return (
      readVariable(EnvironmentVariable.ApolloKey) !== "" &&
      environment.graphName() !== "" &&
      environment.graphVariant() !== ""
    );
  },
  /** Sets values in this process only, over anything .env already set. */
  applyVariables(values: EnvironmentValues): void {
    loadEnvFile();
    for (const [name, value] of Object.entries(values)) {
      if (value !== undefined) {
        process.env[name] = value;
      }
    }
  },
  /** Saves values to .env, keeping every other line already in it. */
  writeVariables(values: EnvironmentValues): void {
    const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
    writeFileSync(ENV_FILE, mergeEnvContents(existing, values));
  },
};

export const environmentContract: EnvironmentContract = {
  graphName() {
    return environment.graphName();
  },
};
