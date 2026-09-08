import { useState } from "react";

import ErrorDetails from "@/renderer/features/ErrorModal/components/ErrorDetails";
import styles from "@/renderer/features/ErrorModal/ErrorModal.module.scss";
import ModalDialog, { ModalSeverity } from "@/renderer/ui/ModalDialog";
import PagerArrows from "@/renderer/ui/PagerArrows";
import RawOutput from "@/renderer/ui/RawOutput";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

const MODAL_TITLE = "Error";

const FALLBACK_DIAGNOSIS: Diagnosis = {
  key: ErrorKey.Unknown,
  summary: "This error is not recognized",
  cause: "The app doesn't have a known explanation for this one.",
  resolution: ["Ask on the team's Confluence page"],
  raw: null,
};

type ErrorModalProps = {
  open: boolean;
  subject: string;
  diagnoses: Diagnosis[];
  onClose: () => void;
};

/** Steps through one subject's errors one at a time. */
export default function ErrorModal({
  open,
  subject,
  diagnoses,
  onClose,
}: ErrorModalProps) {
  const [index, setIndex] = useState(0);
  const shown = diagnoses.length === 0 ? [FALLBACK_DIAGNOSIS] : diagnoses;
  const diagnosis = shown[index];

  return (
    <ModalDialog
      open={open}
      title={MODAL_TITLE}
      severity={ModalSeverity.Error}
      onClose={onClose}
    >
      <ErrorDetails subject={subject} diagnosis={diagnosis} />
      <div className={styles.errorModal__footer}>
        <RawOutput
          raw={diagnosis.raw}
          startOpen={diagnosis.key === ErrorKey.Unknown}
        />
        <div className={styles.errorModal__pager}>
          <PagerArrows
            index={index}
            count={shown.length}
            subject="error"
            onChange={setIndex}
          />
        </div>
      </div>
    </ModalDialog>
  );
}
