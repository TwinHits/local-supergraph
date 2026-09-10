import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

type Signature = Omit<Diagnosis, "raw">;

/** Every error the app knows how to explain. */
export const SIGNATURES: Record<ErrorKey, Signature> = {
  [ErrorKey.RoverMissing]: {
    key: ErrorKey.RoverMissing,
    summary: "rover is not installed",
    cause: "Rover isn't installed, or isn't on your PATH.",
    resolution: ["Install rover, then reopen the app so it picks up your PATH"],
  },
  [ErrorKey.GraphRefUnset]: {
    key: ErrorKey.GraphRefUnset,
    summary: "The graph ref or variant is not set",
    cause: "APOLLO_GRAPH_REF or SUPERGRAPH_VARIANTS isn't set in .env.",
    resolution: ["Fill in both values in .env", "Reopen the app"],
  },
  [ErrorKey.ApolloKeyInvalid]: {
    key: ErrorKey.ApolloKeyInvalid,
    summary: "The Apollo API key was rejected",
    cause: "The key is missing, expired, or doesn't have access to the graph.",
    resolution: [
      "Regenerate the key at studio.apollographql.com",
      "Paste it into .env",
    ],
  },
  [ErrorKey.GraphNotFound]: {
    key: ErrorKey.GraphNotFound,
    summary: "The key cannot see that graph",
    cause: "The graph or variant doesn't exist, or the key can't access it.",
    resolution: [
      "Check that APOLLO_GRAPH_REF points to a real graph and variant",
      "Check that the key belongs to the same organization",
    ],
  },
  [ErrorKey.AwsSsoExpired]: {
    key: ErrorKey.AwsSsoExpired,
    summary: "AWS credentials are stale",
    cause: "Your SSO session expired, so the subgraph can't start.",
    resolution: ["Sign in again, then restart the subgraph"],
  },
  [ErrorKey.PortInUse]: {
    key: ErrorKey.PortInUse,
    summary: "Something already holds the port",
    cause: "Another process is already using it.",
    resolution: ["Find the process, then pick another port or stop it"],
  },
  [ErrorKey.PortInvalid]: {
    key: ErrorKey.PortInvalid,
    summary: "That port cannot be used",
    cause: "The port is missing, out of range, or already claimed.",
    resolution: ["Pick a different port"],
  },
  [ErrorKey.CompositionFailed]: {
    key: ErrorKey.CompositionFailed,
    summary: "Rover rejected the schema",
    cause: "The local schema is different from the published one.",
    resolution: [
      "Read rover's error below",
      "Run a schema check before publishing",
    ],
  },
  [ErrorKey.ComposedButUnreachable]: {
    key: ErrorKey.ComposedButUnreachable,
    summary: "Composed, but the service is down",
    cause: "Rover composed the schema, but the service still isn't answering.",
    resolution: ["Start the local service"],
  },
  [ErrorKey.LocalRefused]: {
    key: ErrorKey.LocalRefused,
    summary: "Nothing is listening on that port",
    cause: "The service isn't running, or it's on a different port.",
    resolution: ["Start the service", "Check the port matches"],
  },
  [ErrorKey.RemoteUnreachable]: {
    key: ErrorKey.RemoteUnreachable,
    summary: "The deployed URL did not answer",
    cause: "You're not connected to the VPN, or the environment is down.",
    resolution: ["Connect to the VPN"],
  },
  [ErrorKey.Unknown]: {
    key: ErrorKey.Unknown,
    summary: "This error is not recognized",
    cause: "The app doesn't have a known explanation for this one.",
    resolution: ["No known fix for this error"],
  },
};

/** What each signature recognizes in the text of a failure. */
export const PATTERNS: Record<ErrorKey, RegExp[]> = {
  [ErrorKey.RoverMissing]: [/\bENOENT\b/],
  [ErrorKey.GraphRefUnset]: [],
  [ErrorKey.ApolloKeyInvalid]: [
    /\bE004\b/,
    /invalid .*api key/i,
    /401 unauthorized/i,
  ],
  [ErrorKey.GraphNotFound]: [/\bE009\b/, /could not find graph/i],
  [ErrorKey.AwsSsoExpired]: [
    /\bexpiredtoken\b/i,
    /sso session .*expired/i,
    /token has expired/i,
  ],
  [ErrorKey.PortInUse]: [/\bEADDRINUSE\b/],
  [ErrorKey.PortInvalid]: [],
  [ErrorKey.CompositionFailed]: [
    /composition (failed|error)/i,
    /satisfiability_error/i,
    /encountered \d+ build error/i,
  ],
  [ErrorKey.ComposedButUnreachable]: [],
  [ErrorKey.LocalRefused]: [],
  [ErrorKey.RemoteUnreachable]: [/\bENOTFOUND\b/, /\bEAI_AGAIN\b/],
  [ErrorKey.Unknown]: [],
};

/** The order errors are shown in, with root causes above their symptoms. */
export const PRIORITY: ErrorKey[] = [
  ErrorKey.RoverMissing,
  ErrorKey.GraphRefUnset,
  ErrorKey.ApolloKeyInvalid,
  ErrorKey.GraphNotFound,
  ErrorKey.AwsSsoExpired,
  ErrorKey.PortInUse,
  ErrorKey.PortInvalid,
  ErrorKey.CompositionFailed,
  ErrorKey.ComposedButUnreachable,
  ErrorKey.LocalRefused,
  ErrorKey.RemoteUnreachable,
  ErrorKey.Unknown,
];
