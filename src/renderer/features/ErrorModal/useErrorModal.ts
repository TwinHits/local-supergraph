import { useCallback, useState } from "react";

import { type Diagnosis } from "@/shared/errors/errors.types";

type Shown = {
  subject: string;
  diagnoses: Diagnosis[];
};

const CLOSED: Shown = { subject: "", diagnoses: [] };

/** Holds whichever failures are on screen. */
export function useErrorModal() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Shown>(CLOSED);

  const show = useCallback(function reveal(
    subject: string,
    diagnoses: Diagnosis[]
  ) {
    setShown({ subject, diagnoses });
    setOpen(true);
  }, []);

  const close = useCallback(function hide() {
    setOpen(false);
  }, []);

  return { open, shown, show, close };
}
