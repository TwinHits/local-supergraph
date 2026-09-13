import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import { reconcileVariant } from "@/renderer/hooks/useGraph.utils";

/** The graph the app is pointed at and the variant showing. */
export function useGraph() {
  const [graphName, setGraphName] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [variant, setVariant] = useState("");

  const select = useCallback(function change(name: string) {
    void api.settings.updateVariant(name).then(setVariant);
  }, []);

  const load = useCallback(
    function read() {
      void api.environment.graphName().then(setGraphName);
      void Promise.all([
        api.settings.variantFilter(),
        api.settings.currentVariant(),
      ]).then(function applyFilter([filter, current]) {
        if (filter.length > 0) {
          setVariants(filter);
          const fallback = reconcileVariant(filter, current);
          if (fallback === null) {
            setVariant(current);
          } else {
            select(fallback);
          }
          return;
        }
        void api.apollo.allVariants().then(function applyAll(all) {
          setVariants(all);
          const fallback = reconcileVariant(all, current);
          if (fallback === null) {
            setVariant(current);
          } else {
            select(fallback);
          }
        });
      });
    },
    [select]
  );

  useEffect(load, [load]);

  return { graphName, variants, variant, select, reload: load };
}
