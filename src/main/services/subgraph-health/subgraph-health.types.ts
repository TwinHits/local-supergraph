import { type ErrorKey } from "@/shared/errors/errors.types";

/** Where one subgraph answers from and which failure its silence means. */
export type Target = {
  name: string;
  url: string;
  key: ErrorKey;
};

/** Whether a URL answered and the error when it did not. */
export type ProbeResult = {
  reachable: boolean;
  raw: string | null;
};
