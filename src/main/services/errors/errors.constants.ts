import { ErrorKey, type Diagnosis } from "@/shared/errors/errors.types";

type Signature = Omit<Diagnosis, "raw">;

/**
 * The §7 table, in priority order. First match wins, and the root cause is
 * authored above the symptoms it produces.
 */
export const SIGNATURES: Record<ErrorKey, Signature> = {
  [ErrorKey.ApolloKeyInvalid]: {
    key: ErrorKey.ApolloKeyInvalid,
    summary: "Apollo rejected the key",
    cause: "APOLLO_KEY is invalid or has expired.",
    resolution: [
      "Regenerate the key at studio.apollographql.com",
      "Paste it into .env",
    ],
    command: null,
  },
  [ErrorKey.AwsSsoExpired]: {
    key: ErrorKey.AwsSsoExpired,
    summary: "AWS credentials are stale",
    cause: "The SSO session expired, so the subgraph cannot boot.",
    resolution: ["Sign in again, then restart the subgraph"],
    command: "aws sso login --profile <profile>",
  },
  [ErrorKey.PortInUse]: {
    key: ErrorKey.PortInUse,
    summary: "Something already holds the port",
    cause: "Another process is bound to it.",
    resolution: ["Find the process, then pick another port or stop it"],
    command: "netstat -ano | findstr :<port>",
  },
  [ErrorKey.CompositionFailed]: {
    key: ErrorKey.CompositionFailed,
    summary: "Rover rejected the schema",
    cause: "The local schema has diverged from the published one.",
    resolution: [
      "Read rover's error below",
      "Run a schema check before publishing",
    ],
    command: null,
  },
  [ErrorKey.ComposedButUnreachable]: {
    key: ErrorKey.ComposedButUnreachable,
    summary: "Composed, but the service is down",
    cause: "Rover accepted the published schema and the probe still fails.",
    resolution: ["Start the local service"],
    command: null,
  },
  [ErrorKey.LocalRefused]: {
    key: ErrorKey.LocalRefused,
    summary: "Nothing is listening on that port",
    cause: "The service is not running, or it is on a different port.",
    resolution: ["Start the service", "Check the port matches"],
    command: "netstat -ano | findstr :<port>",
  },
  [ErrorKey.RemoteUnreachable]: {
    key: ErrorKey.RemoteUnreachable,
    summary: "The deployed URL did not answer",
    cause: "VPN is down, or the environment is.",
    resolution: ["Check the VPN", "Check the environment status page"],
    command: null,
  },
  [ErrorKey.Unknown]: {
    key: ErrorKey.Unknown,
    summary: "This error is not recognized",
    cause: "No signature matched.",
    resolution: ["Ask in the team Confluence page"],
    command: null,
  },
};

/** Priority order, highest first. The modal steps through them in this order. */
export const PRIORITY: ErrorKey[] = [
  ErrorKey.ApolloKeyInvalid,
  ErrorKey.AwsSsoExpired,
  ErrorKey.PortInUse,
  ErrorKey.CompositionFailed,
  ErrorKey.ComposedButUnreachable,
  ErrorKey.LocalRefused,
  ErrorKey.RemoteUnreachable,
  ErrorKey.Unknown,
];
