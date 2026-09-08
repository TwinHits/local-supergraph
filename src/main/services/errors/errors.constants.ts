import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

type Signature = Omit<Diagnosis, "raw">;

/** Every error the app knows how to explain. */
export const SIGNATURES: Record<ErrorKey, Signature> = {
  [ErrorKey.RoverMissing]: {
    key: ErrorKey.RoverMissing,
    summary: "rover is not installed",
    cause:
      "Rover reached the graph but the answer never came back, and every retry since has timed out the same way, so the variant cannot be composed until whatever is in the way moves along or someone restarts it soon.",
    resolution: ["Install rover, then reopen the app so it picks up your PATH"],
  },
  [ErrorKey.GraphRefUnset]: {
    key: ErrorKey.GraphRefUnset,
    summary: "Vampires have drained the schema registry",
    cause: "Every field came back pale and empty.",
    resolution: ["Fill both in .env", "Reopen the app"],
  },
  [ErrorKey.ApolloKeyInvalid]: {
    key: ErrorKey.ApolloKeyInvalid,
    summary: "A katana has severed the router link",
    cause: "One clean cut, straight through the socket.",
    resolution: [
      "Regenerate the key at studio.apollographql.com",
      "Paste it into .env",
    ],
  },
  [ErrorKey.GraphNotFound]: {
    key: ErrorKey.GraphNotFound,
    summary: "The key cannot see that graph",
    cause:
      "The graph or variant does not exist, or the key has no access to it.",
    resolution: [
      "Check APOLLO_GRAPH_REF names a real graph and variant",
      "Check the key belongs to the same organization",
    ],
  },
  [ErrorKey.AwsSsoExpired]: {
    key: ErrorKey.AwsSsoExpired,
    summary: "AWS credentials are stale",
    cause: "The SSO session expired, so the subgraph cannot boot.",
    resolution: ["Sign in again, then restart the subgraph"],
  },
  [ErrorKey.PortInUse]: {
    key: ErrorKey.PortInUse,
    summary: "Something already holds the port",
    cause: "Another process is bound to it.",
    resolution: ["Find the process, then pick another port or stop it"],
  },
  [ErrorKey.CompositionFailed]: {
    key: ErrorKey.CompositionFailed,
    summary: "Rover rejected the schema",
    cause: "The local schema has diverged from the published one.",
    resolution: [
      "Read rover's error below",
      "Run a schema check before publishing",
    ],
  },
  [ErrorKey.ComposedButUnreachable]: {
    key: ErrorKey.ComposedButUnreachable,
    summary: "Composed, but the service is down",
    cause: "Rover accepted the published schema and the probe still fails.",
    resolution: ["Start the local service"],
  },
  [ErrorKey.LocalRefused]: {
    key: ErrorKey.LocalRefused,
    summary: "Nothing is listening on that port",
    cause: "The service is not running, or it is on a different port.",
    resolution: ["Start the service", "Check the port matches"],
  },
  [ErrorKey.RemoteUnreachable]: {
    key: ErrorKey.RemoteUnreachable,
    summary: "The deployed URL did not answer",
    cause: "VPN is down, or the environment is.",
    resolution: ["Check the VPN", "Check the environment status page"],
  },
  [ErrorKey.Unknown]: {
    key: ErrorKey.Unknown,
    summary: "This error is not recognized",
    cause: "No signature matched.",
    resolution: ["Ask in the team Confluence page"],
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
  [ErrorKey.CompositionFailed]: [/composition (failed|error)/i],
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
  ErrorKey.CompositionFailed,
  ErrorKey.ComposedButUnreachable,
  ErrorKey.LocalRefused,
  ErrorKey.RemoteUnreachable,
  ErrorKey.Unknown,
];
