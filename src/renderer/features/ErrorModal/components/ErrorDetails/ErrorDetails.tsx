import styles from "@/renderer/features/ErrorModal/components/ErrorDetails/ErrorDetails.module.scss";
import TextLabel from "@/renderer/ui/TextLabel";
import { type Diagnosis } from "@/shared/errors/errors.types";

type ErrorDetailsProps = {
  diagnosis: Diagnosis;
};

/** Lays out one error the same way wherever it appears. */
export default function ErrorDetails({ diagnosis }: ErrorDetailsProps) {
  return (
    <div className={styles.errorDetails}>
      <TextLabel>{diagnosis.summary}</TextLabel>
      <TextLabel muted>{diagnosis.cause}</TextLabel>
      <ul className={styles.errorDetails__steps}>
        {diagnosis.resolution.map(function toStep(step) {
          return (
            <li key={step}>
              <TextLabel>{step}</TextLabel>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
