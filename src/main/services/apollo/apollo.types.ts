import { type RegisteredSubgraph } from "@/shared/apollo/apollo.types";
import { type ErrorKey } from "@/shared/errors/errors.types";

/** One subgraph in rover's `subgraph list --format json` answer. */
export type RoverSubgraph = {
  name: string;
  url: string;
};

/** The shape of rover's JSON answer. */
export type RoverResponse = {
  data?: {
    subgraphs?: RoverSubgraph[];
    success?: boolean;
  };
  error?: {
    message?: string;
    code?: string;
  } | null;
};

/** Rover's answer once it is parsed. */
export type ParsedListing = {
  subgraphs: RegisteredSubgraph[];
  failed: boolean;
  keys: ErrorKey[];
  raw: string | null;
};
