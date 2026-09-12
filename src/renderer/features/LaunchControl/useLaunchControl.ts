import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

const STATE_POLL_MS = 1000;

/** Starts and stops the supergraph, polling main for its real state. */
export function useLaunchControl() {
  const [state, setState] = useState(SupergraphState.Stopped);

  useEffect(function pollState() {
    const interval = setInterval(function check() {
      void api.supergraph.status().then(setState);
    }, STATE_POLL_MS);
    return function stop() {
      clearInterval(interval);
    };
  }, []);

  const start = useCallback(function startSupergraph() {
    void api.supergraph.start().then(setState);
  }, []);

  const stop = useCallback(function stopSupergraph() {
    void api.supergraph.stop().then(setState);
  }, []);

  const openRouter = useCallback(function openRouterInBrowser() {
    void api.settings.routerAddress().then(function open(address) {
      void api.windowControls.openExternal(address);
    });
  }, []);

  return { state, start, stop, openRouter };
}
