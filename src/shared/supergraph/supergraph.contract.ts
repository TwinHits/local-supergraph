import { type SupergraphState } from "@/shared/supergraph/supergraph.types";

/** What the renderer may do to start and stop the supergraph. */
export type SupergraphContract = {
  start(): SupergraphState;
  stop(): SupergraphState;
  status(): SupergraphState;
};
