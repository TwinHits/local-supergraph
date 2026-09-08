import styles from "@/renderer/features/ErrorModal/components/ErrorDetails/ErrorDetails.module.scss";
import TextLabel from "@/renderer/ui/TextLabel";
import { type Diagnosis } from "@/shared/errors/errors.types";

type ErrorDetailsProps = {
  subject: string;
  diagnosis: Diagnosis;
};

/** Lays out one error the same way wherever it appears. */
export default function ErrorDetails({
  subject,
  diagnosis,
}: ErrorDetailsProps) {
  return (
    <div className={styles.errorDetails}>
      <section className={styles.errorDetails__section}>
        <span className={styles.errorDetails__heading}>Name</span>
        <TextLabel>{subject}</TextLabel>
      </section>
      <section className={styles.errorDetails__section}>
        <span className={styles.errorDetails__heading}>Error</span>
        <TextLabel>{diagnosis.summary}</TextLabel>
        <TextLabel muted>{diagnosis.cause}</TextLabel>
      </section>
      <section className={styles.errorDetails__section}>
        <span className={styles.errorDetails__heading}>Resolution</span>
        <ul className={styles.errorDetails__steps}>
          {diagnosis.resolution.map(function toStep(step) {
            return (
              <li key={step}>
                <TextLabel>{step}</TextLabel>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
