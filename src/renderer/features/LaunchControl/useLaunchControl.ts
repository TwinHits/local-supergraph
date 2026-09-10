import { useCallback, useRef, useState } from "react";

import { api } from "@/renderer/api";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

/** Starts and stops the supergraph, and tracks whether it is running. */
export function useLaunchControl() {
  const [state, setState] = useState(SupergraphState.Stopped);
  const cancelled = useRef(false);

  const start = useCallback(function startSupergraph() {
    cancelled.current = false;
    setState(SupergraphState.Starting);
    void api.supergraph.start().then(function apply(next) {
      if (!cancelled.current) {
        setState(next);
      }
    });
  }, []);

  const stop = useCallback(function stopSupergraph() {
    cancelled.current = true;
    void api.supergraph.stop().then(setState);
  }, []);

  return { state, start, stop };
}
