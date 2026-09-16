import { useState } from "react";

import AlertBanner from "@/renderer/ui/AlertBanner";
import styles from "@/renderer/ui/ErrorBanner/ErrorBanner.module.scss";
import PagerArrows from "@/renderer/ui/PagerArrows";
import { buildDiagnosisMessage } from "@/renderer/utils/diagnosis.utils";
import { type Diagnosis } from "@/shared/errors/errors.types";

type ErrorBannerProps = {
  diagnoses: Diagnosis[];
  onClick?: () => void;
};

/** Shows a list of failures one at a time. */
export default function ErrorBanner({ diagnoses, onClick }: ErrorBannerProps) {
  const [index, setIndex] = useState(0);
  const diagnosis = diagnoses[index] ?? diagnoses[0];

  if (diagnosis === undefined) {
    return null;
  }

  return (
    <div className={styles.errorBanner}>
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
        onClick={onClick}
      />
    </div>
  );
}
