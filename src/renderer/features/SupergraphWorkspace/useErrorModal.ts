import { useCallback, useState } from "react";

import { type Diagnosis } from "@/shared/errors/errors.types";

type Shown = {
  title: string;
  diagnoses: Diagnosis[];
};

const CLOSED: Shown = { title: "", diagnoses: [] };

/** Holds whichever failures are on screen. */
export function useErrorModal() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Shown>(CLOSED);

  const show = useCallback(function reveal(
    title: string,
    diagnoses: Diagnosis[]
  ) {
    setShown({ title, diagnoses });
    setOpen(true);
  }, []);

  const close = useCallback(function hide() {
    setOpen(false);
  }, []);

  return { open, shown, show, close };
}
