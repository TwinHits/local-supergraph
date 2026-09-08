import styles from "@/renderer/features/SubgraphTable/components/StatusIndicator/StatusIndicator.module.scss";
import HoverTooltip from "@/renderer/ui/HoverTooltip";
import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
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
    if (status === RowStatus.Healthy) {
      return shape;
    }
    return <HoverTooltip title={reason}>{shape}</HoverTooltip>;
  }

  return (
    <IconButton
      label={`${status}: ${reason}`}
      tooltip={reason}
      variant={IconButtonVariant.Inline}
      onClick={onClick}
    >
      {shape}
    </IconButton>
  );
}
