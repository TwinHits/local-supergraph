import styles from "@/renderer/features/SubgraphTable/components/StatusIndicator/StatusIndicator.module.scss";
import HoverTooltip from "@/renderer/ui/HoverTooltip";
import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import { RowStatus } from "@/shared/subgraph/subgraph.types";

type StatusIndicatorProps = {
  status: RowStatus;
  reason: string;
  running?: boolean;
  onClick?: () => void;
};

const SHAPES: Record<RowStatus, string> = {
  [RowStatus.Healthy]: styles["statusIndicator--healthy"],
  [RowStatus.Failed]: styles["statusIndicator--failed"],
  [RowStatus.Pending]: styles["statusIndicator--pending"],
};

/**
 * What healthy, failed and pending look like. Running marks a subgraph the
 * graph actually needs right now: a spinning ring on a healthy one, a
 * faster pulse on a failed one — the graph is up but this piece of it isn't.
 */
export default function StatusIndicator({
  status,
  reason,
  running,
  onClick,
}: StatusIndicatorProps) {
  const shape = (
    <span
      role="img"
      aria-label={`${status}: ${reason}`}
      className={[
        styles.statusIndicator,
        SHAPES[status],
        running === true ? styles["statusIndicator--running"] : "",
      ]
        .join(" ")
        .trim()}
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
