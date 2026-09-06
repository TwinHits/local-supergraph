import { useState } from "react";

import ErrorDetails from "@/renderer/features/ErrorModal/components/ErrorDetails";
import styles from "@/renderer/features/ErrorModal/ErrorModal.module.scss";
import {
  canGoBack,
  hasArrows,
  nextIndex,
  position,
  previousIndex,
} from "@/renderer/features/ErrorModal/errorModal.utils";
import Button from "@/renderer/ui/Button";
import Icon, { IconName } from "@/renderer/ui/Icon";
import IconButton from "@/renderer/ui/IconButton";
import Modal from "@/renderer/ui/Modal";
import Text from "@/renderer/ui/Text";
import { type Diagnosis } from "@/shared/errors/errors.types";

type ErrorModalProps = {
  open: boolean;
  subgraph: string;
  url: string;
  diagnoses: Diagnosis[];
  onCopy: (command: string) => void;
  onRetry: () => void;
  onClose: () => void;
};

/**
 * One error at a time, with arrows through the rest (§4.4). Keyed by subgraph
 * at the call site, so a different subgraph remounts and starts at its top match.
 */
export default function ErrorModal({
  open,
  subgraph,
  url,
  diagnoses,
  onCopy,
  onRetry,
  onClose,
}: ErrorModalProps) {
  const [index, setIndex] = useState(0);
  const diagnosis = diagnoses[index];

  return (
    <Modal open={open} title={`${subgraph} — ${url}`} onClose={onClose}>
      {hasArrows(diagnoses.length) ? (
        <div className={styles.errorModal__pager}>
          <IconButton
            label="Previous error"
            tooltip="Previous error"
            disabled={!canGoBack(index)}
            onClick={function back() {
              setIndex(previousIndex(index));
            }}
          >
            <Icon name={IconName.Back} />
          </IconButton>
          <Text muted>{position(index, diagnoses.length)}</Text>
          <IconButton
            label="Next error"
            tooltip="Next error"
            onClick={function forward() {
              setIndex(nextIndex(index, diagnoses.length));
            }}
          >
            <Icon name={IconName.Forward} />
          </IconButton>
        </div>
      ) : null}
      {diagnosis === undefined ? null : (
        <ErrorDetails diagnosis={diagnosis} onCopy={onCopy} />
      )}
      <div className={styles.errorModal__footer}>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    </Modal>
  );
}
