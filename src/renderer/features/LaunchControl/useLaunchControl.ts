import { useCallback, useState } from "react";

import { api } from "@/renderer/api";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

/** Starts and stops the supergraph, and tracks whether it is running. */
export function useLaunchControl() {
  const [state, setState] = useState(SupergraphState.Stopped);

  const start = useCallback(function startSupergraph() {
    setState(SupergraphState.Starting);
    void api.supergraph.start().then(setState);
  }, []);

  const stop = useCallback(function stopSupergraph() {
    void api.supergraph.stop().then(setState);
  }, []);

  return { state, start, stop };
}
