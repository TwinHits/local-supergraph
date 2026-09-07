import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";

/** The graph the app is pointed at, and which of its variants is showing. */
export function useGraph() {
  const [graphName, setGraphName] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [variant, setVariant] = useState("");

  const load = useCallback(function read() {
    void api.environment.graphName().then(setGraphName);
    void api.environment.variants().then(setVariants);
    void api.settings.currentVariant().then(setVariant);
  }, []);

  useEffect(load, [load]);

  const select = useCallback(function change(name: string) {
    void api.settings.selectVariant(name).then(setVariant);
  }, []);

  return { graphName, variants, variant, select };
}
