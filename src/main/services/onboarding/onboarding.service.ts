import { apollo } from "@/main/services/apollo/apollo.service";
import {
  isAwsCliInstalled,
  isSessionManagerPluginInstalled,
} from "@/main/services/aws/aws.service";
import { hasConfigFile } from "@/main/services/databases/databases.service";
import { EnvironmentVariable } from "@/main/services/environment/environment.constants";
import { environment } from "@/main/services/environment/environment.service";
import { type EnvironmentValues } from "@/main/services/environment/environment.types";
import { errors } from "@/main/services/errors/errors.service";
import { runRover } from "@/main/services/rover/rover.service";
import {
  markOnboardingCompleted,
  readOnboardingCompletedVersion,
  settings,
} from "@/main/services/settings/settings.service";
import { type Awaitable } from "@/shared/contract/contract.types";
import { type OnboardingContract } from "@/shared/onboarding/onboarding.contract";
import {
  type ApolloCredentials,
  type OnboardingStatus,
  Prerequisite,
} from "@/shared/onboarding/onboarding.types";

let appVersion = "";

/** Gives the service the app version finishing the wizard is recorded against. */
export function registerAppVersion(version: string): void {
  appVersion = version;
}

/** Whether rover can be found where launching the supergraph looks for it. */
async function isRoverInstalled(): Promise<boolean> {
  const result = await runRover(["--version"]);
  return result.found;
}

const PREREQUISITE_CHECKS: Record<
  Prerequisite,
  () => Promise<boolean> | boolean
> = {
  [Prerequisite.Rover]: isRoverInstalled,
  [Prerequisite.AwsCli]: isAwsCliInstalled,
  [Prerequisite.SessionManagerPlugin]: isSessionManagerPluginInstalled,
  [Prerequisite.DatabasesConfig]: hasConfigFile,
};

/** Every prerequisite that is missing right now, in the enum's order. */
async function findMissingPrerequisites(): Promise<Prerequisite[]> {
  const prerequisites = Object.values(Prerequisite);
  const found = await Promise.all(
    prerequisites.map(function check(prerequisite) {
      return PREREQUISITE_CHECKS[prerequisite]();
    })
  );
  return prerequisites.filter(function isMissing(_prerequisite, index) {
    return !found[index];
  });
}

/** Where the wizard stands on this launch. */
async function status(): Promise<OnboardingStatus> {
  const missing = await findMissingPrerequisites();
  return {
    completed: readOnboardingCompletedVersion() === appVersion,
    configured: environment.isConfigured(),
    missing,
  };
}

/** Whether the registry accepts the credentials, saving them and keeping their variant selected only if it does. */
async function submitCredentials(
  credentials: ApolloCredentials
): Promise<boolean> {
  const values: EnvironmentValues = {
    [EnvironmentVariable.ApolloKey]: credentials.apolloKey,
    [EnvironmentVariable.ApolloGraphRef]: credentials.graphRef,
  };
  const previousVariant = settings.currentVariant();

  environment.applyVariables(values);
  settings.updateVariant(environment.graphVariant());
  await apollo.reloadSubgraphs();

  if (errors.supergraphErrors().length > 0) {
    settings.updateVariant(previousVariant);
    return false;
  }
  environment.writeVariables(values);
  return true;
}

/** Records that the wizard was finished on this app version. */
function complete(): void {
  markOnboardingCompleted(appVersion);
}

export const onboarding: Awaitable<OnboardingContract> = {
  status,
  submitCredentials,
  complete,
};
