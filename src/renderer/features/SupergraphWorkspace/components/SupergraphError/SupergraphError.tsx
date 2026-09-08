import { useState } from "react";

import styles from "@/renderer/features/SupergraphWorkspace/components/SupergraphError/SupergraphError.module.scss";
import { buildDiagnosisMessage } from "@/renderer/features/SupergraphWorkspace/supergraphWorkspace.utils";
import AlertBanner from "@/renderer/ui/AlertBanner";
import PagerArrows from "@/renderer/ui/PagerArrows";
import { type Diagnosis } from "@/shared/errors/errors.types";

type SupergraphErrorProps = {
  diagnoses: Diagnosis[];
  onShowErrors: () => void;
};

/** Shows the supergraph's failures one at a time. */
export default function SupergraphError({
  diagnoses,
  onShowErrors,
}: SupergraphErrorProps) {
  const [index, setIndex] = useState(0);
  const diagnosis = diagnoses[index] ?? diagnoses[0];

  if (diagnosis === undefined) {
    return <div className={styles.supergraphError} />;
  }

  return (
    <div className={styles.supergraphError}>
      <AlertBanner
        message={buildDiagnosisMessage(diagnosis)}
        actions={
          <PagerArrows
            index={index}
            count={diagnoses.length}
            subject="error"
            onChange={setIndex}
          />
        }
        onClick={onShowErrors}
      />
    </div>
  );
}
