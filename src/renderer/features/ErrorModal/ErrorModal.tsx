import { useState } from "react";

import ErrorDetails from "@/renderer/features/ErrorModal/components/ErrorDetails";
import styles from "@/renderer/features/ErrorModal/ErrorModal.module.scss";
import ActionButton from "@/renderer/ui/ActionButton";
import Collapse from "@/renderer/ui/Collapse";
import ModalDialog, { ModalSeverity } from "@/renderer/ui/ModalDialog";
import PagerArrows from "@/renderer/ui/PagerArrows";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

const MODAL_TITLE = "Error";

const FALLBACK_DIAGNOSIS: Diagnosis = {
  key: ErrorKey.Unknown,
  summary: "This error is not recognized",
  cause: "The app doesn't have a known explanation for this one.",
  resolution: ["No known fix for this error"],
  raw: null,
  database: null,
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
  const [rawOpen, setRawOpen] = useState(false);
  const shown = diagnoses.length === 0 ? [FALLBACK_DIAGNOSIS] : diagnoses;
  const diagnosis = shown[index];
  const alwaysShowRaw = diagnosis.key === ErrorKey.Unknown;

  return (
    <ModalDialog
      open={open}
      title={MODAL_TITLE}
      severity={ModalSeverity.Error}
      onClose={onClose}
    >
      <ErrorDetails subject={subject} diagnosis={diagnosis} />
      {diagnosis.raw === null ? null : (
        <Collapse in={alwaysShowRaw || rawOpen}>
          <pre className={styles.errorModal__raw}>{diagnosis.raw}</pre>
        </Collapse>
      )}
      <div className={styles.errorModal__footer}>
        {diagnosis.raw === null || alwaysShowRaw ? null : (
          <ActionButton
            onClick={function toggleRaw() {
              setRawOpen(!rawOpen);
            }}
          >
            More info
          </ActionButton>
        )}
        <div className={styles.errorModal__pager}>
          <PagerArrows
            index={index}
            count={shown.length}
            subject="error"
            onChange={function changeIndex(next) {
              setIndex(next);
              setRawOpen(false);
            }}
          />
        </div>
      </div>
    </ModalDialog>
  );
}
