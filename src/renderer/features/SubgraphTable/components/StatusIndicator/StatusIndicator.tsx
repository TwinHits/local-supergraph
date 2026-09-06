import Tooltip from "@/renderer/ui/Tooltip";
import { RowStatus } from "@/shared/subgraph/subgraph.types";
import styles from "@/renderer/features/SubgraphTable/components/StatusIndicator/StatusIndicator.module.scss";

type StatusIndicatorProps = {
  status: RowStatus;
  reason: string;
  onClick?: () => void;
};

const SHAPES: Record<RowStatus, string> = {
  [RowStatus.Healthy]: styles.healthy,
  [RowStatus.Failed]: styles.failed,
  [RowStatus.Pending]: styles.pending,
};

/** One definition of what healthy, failed and pending look like. */
export default function StatusIndicator({
  status,
  reason,
  onClick,
}: StatusIndicatorProps) {
  const shape = (
    <span
      role="img"
      aria-label={`${status}: ${reason}`}
      className={`${styles.indicator} ${SHAPES[status]}`}
    />
  );

  if (onClick === undefined) {
    return <Tooltip title={reason}>{shape}</Tooltip>;
  }

  return (
    <Tooltip title={reason}>
      <button
        type="button"
        aria-label={`${status}: ${reason}`}
        className={styles.button}
        onClick={onClick}
      >
        {shape}
      </button>
    </Tooltip>
  );
}
