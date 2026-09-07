import styles from "@/renderer/features/SubgraphTable/components/StatusIndicator/StatusIndicator.module.scss";
import HoverTooltip from "@/renderer/ui/HoverTooltip";
import { RowStatus } from "@/shared/subgraph/subgraph.types";

type StatusIndicatorProps = {
  status: RowStatus;
  reason: string;
  onClick?: () => void;
};

const SHAPES: Record<RowStatus, string> = {
  [RowStatus.Healthy]: styles["statusIndicator--healthy"],
  [RowStatus.Failed]: styles["statusIndicator--failed"],
  [RowStatus.Pending]: styles["statusIndicator--pending"],
};

/** What healthy, failed and pending look like. */
export default function StatusIndicator({
  status,
  reason,
  onClick,
}: StatusIndicatorProps) {
  const shape = (
    <span
      role="img"
      aria-label={`${status}: ${reason}`}
      className={`${styles.statusIndicator} ${SHAPES[status]}`}
    />
  );

  if (onClick === undefined) {
    return <HoverTooltip title={reason}>{shape}</HoverTooltip>;
  }

  return (
    <HoverTooltip title={reason}>
      <button
        type="button"
        aria-label={`${status}: ${reason}`}
        className={styles.statusIndicator__button}
        onClick={onClick}
      >
        {shape}
      </button>
    </HoverTooltip>
  );
}
