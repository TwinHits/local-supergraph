import { useState } from "react";

import ErrorDetails from "@/renderer/features/ErrorModal/components/ErrorDetails";
import styles from "@/renderer/features/ErrorModal/ErrorModal.module.scss";
import ModalDialog from "@/renderer/ui/ModalDialog";
import PagerArrows from "@/renderer/ui/PagerArrows";
import RawOutput from "@/renderer/ui/RawOutput";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

type ErrorModalProps = {
  open: boolean;
  title: string;
  diagnoses: Diagnosis[];
  onClose: () => void;
};

/** Steps through a subject's errors one at a time. */
export default function ErrorModal({
  open,
  title,
  diagnoses,
  onClose,
}: ErrorModalProps) {
  const [index, setIndex] = useState(0);
  const diagnosis = diagnoses[index];

  return (
    <ModalDialog open={open} title={title} onClose={onClose}>
      {diagnosis === undefined ? null : <ErrorDetails diagnosis={diagnosis} />}
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
