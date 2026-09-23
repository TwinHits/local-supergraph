/** A tool or file the app needs before the wizard lets the developer through. */
export enum Prerequisite {
  Rover = "rover",
  AwsCli = "aws-cli",
  SessionManagerPlugin = "session-manager-plugin",
  DatabasesConfig = "databases-config",
}

/** The Apollo values the wizard collects. */
export type ApolloCredentials = {
  apolloKey: string;
  graphRef: string;
};

/** Everything the wizard needs to decide whether to show and which steps to include. */
export type OnboardingStatus = {
  completed: boolean;
  configured: boolean;
  missing: Prerequisite[];
};
