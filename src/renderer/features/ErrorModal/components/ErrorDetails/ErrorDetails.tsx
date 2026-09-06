import styles from "@/renderer/features/ErrorModal/components/ErrorDetails/ErrorDetails.module.scss";
import CopyCommand from "@/renderer/ui/CopyCommand";
import RawOutput from "@/renderer/ui/RawOutput";
import TextLabel from "@/renderer/ui/TextLabel";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

type ErrorDetailsProps = {
  diagnosis: Diagnosis;
  onCopy: (command: string) => void;
};

/** One error, laid out the same way wherever it appears (§2.6). */
export default function ErrorDetails({ diagnosis, onCopy }: ErrorDetailsProps) {
  const unknown = diagnosis.key === ErrorKey.Unknown;

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
      {diagnosis.command === null ? null : (
        <CopyCommand command={diagnosis.command} onCopy={onCopy} />
      )}
      <RawOutput raw={diagnosis.raw} startOpen={unknown} />
    </div>
  );
}
