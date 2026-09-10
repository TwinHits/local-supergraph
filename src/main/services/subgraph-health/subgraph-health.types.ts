import { type ErrorKey } from "@/shared/errors/errors.types";

/** Where one subgraph answers from and which failure its silence means. */
export type Target = {
  name: string;
  url: string;
  key: ErrorKey;
};

/**
 * Whether a URL answered and the error when it did not. A response, even a
 * rejected one, means the network path works — key overrides the target's
 * default so that outcome isn't reported as an unreachable one.
 */
export type ProbeResult = {
  reachable: boolean;
  raw: string | null;
  key?: ErrorKey;
};
