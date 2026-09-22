import { type ReactNode, useState } from "react";

import AlertBanner from "@/renderer/ui/AlertBanner";
import styles from "@/renderer/ui/ErrorBanner/ErrorBanner.module.scss";
import PagerArrows from "@/renderer/ui/PagerArrows";
import { buildDiagnosisMessage } from "@/renderer/utils/diagnosis.utils";
import { type Diagnosis } from "@/shared/errors/errors.types";

type ErrorBannerProps = {
  diagnoses: Diagnosis[];
  onClick?: () => void;
  renderActions?: (diagnosis: Diagnosis) => ReactNode;
};

/** Shows a list of failures one at a time, with room for the caller's own action for the one shown. */
export default function ErrorBanner({
  diagnoses,
  onClick,
  renderActions,
}: ErrorBannerProps) {
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
          <div className={styles.errorBanner__actions}>
            {renderActions?.(diagnosis)}
            <PagerArrows
              index={index}
              count={diagnoses.length}
              subject="error"
              onChange={setIndex}
            />
          </div>
        }
        onClick={onClick}
      />
    </div>
  );
}
