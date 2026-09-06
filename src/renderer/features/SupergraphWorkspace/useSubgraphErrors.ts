import { useCallback, useState } from "react";

import { api } from "@/renderer/api";
import { type Diagnosis } from "@/shared/errors/errors.types";

type Open = {
  subgraph: string;
  url: string;
  diagnoses: Diagnosis[];
};

const CLOSED: Open = { subgraph: "", url: "", diagnoses: [] };

/** Holds the one subgraph whose errors are on screen. */
export function useSubgraphErrors() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Open>(CLOSED);

  const show = useCallback(function read(subgraph: string, url: string) {
    void api.errors.diagnose(subgraph).then(function store(diagnoses) {
      setShown({ subgraph, url, diagnoses });
      setOpen(true);
    });
  }, []);

  const close = useCallback(function hide() {
    setOpen(false);
  }, []);

  return { open, shown, show, close };
}
