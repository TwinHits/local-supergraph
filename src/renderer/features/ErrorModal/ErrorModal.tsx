import { useState } from "react";

import ErrorDetails from "@/renderer/features/ErrorModal/components/ErrorDetails";
import styles from "@/renderer/features/ErrorModal/ErrorModal.module.scss";
import ModalDialog, { ModalSeverity } from "@/renderer/ui/ModalDialog";
import PagerArrows from "@/renderer/ui/PagerArrows";
import RawOutput from "@/renderer/ui/RawOutput";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

const MODAL_TITLE = "Error";

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
  const diagnosis = diagnoses[index];

  return (
    <ModalDialog
      open={open}
      title={MODAL_TITLE}
      severity={ModalSeverity.Error}
      onClose={onClose}
    >
      {diagnosis === undefined ? null : (
        <ErrorDetails subject={subject} diagnosis={diagnosis} />
      )}
      <div className={styles.errorModal__footer}>
        {diagnosis === undefined ? null : (
          <RawOutput
            raw={diagnosis.raw}
            startOpen={diagnosis.key === ErrorKey.Unknown}
          />
        )}
        <PagerArrows
          index={index}
          count={diagnoses.length}
          subject="error"
          onChange={setIndex}
        />
      </div>
    </ModalDialog>
  );
}
