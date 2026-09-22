import HoverTooltip from "@/renderer/ui/HoverTooltip";
import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import styles from "@/renderer/ui/StatusIndicator/StatusIndicator.module.scss";
import { StatusTone } from "@/renderer/ui/StatusIndicator/StatusIndicator.types";

type StatusIndicatorProps = {
  tone: StatusTone;
  /** The word the accessible label leads with — the caller's own vocabulary for this tone. */
  label: string;
  reason: string | null;
  running?: boolean;
  onClick?: () => void;
};

const SHAPES: Record<StatusTone, string> = {
  [StatusTone.Idle]: styles["statusIndicator--idle"],
  [StatusTone.Pending]: styles["statusIndicator--pending"],
  [StatusTone.Healthy]: styles["statusIndicator--healthy"],
  [StatusTone.Failed]: styles["statusIndicator--failed"],
};

/**
 * A colored dot for idle, pending, healthy and failed. Running marks a row
 * the app actually needs right now: a spinning ring on a healthy one, a
 * faster pulse on a failed one.
 */
export default function StatusIndicator({
  tone,
  label,
  reason,
  running,
  onClick,
}: StatusIndicatorProps) {
  const fullLabel = reason === null ? label : `${label}: ${reason}`;
  const dotClassName = [
    styles.statusIndicator,
    SHAPES[tone],
    running === true ? styles["statusIndicator--running"] : "",
  ]
    .join(" ")
    .trim();

  if (onClick !== undefined) {
    // The button below already carries the accessible name; the dot inside
    // it stays unlabeled so a screen reader doesn't announce it twice.
    return (
      <IconButton
        label={fullLabel}
        tooltip={reason ?? undefined}
        variant={IconButtonVariant.Inline}
        stretch={false}
        onClick={onClick}
      >
        <span className={dotClassName} />
      </IconButton>
    );
  }

  const shape = (
    <span role="img" aria-label={fullLabel} className={dotClassName} />
  );

  if (reason === null) {
    return shape;
  }

  return <HoverTooltip title={reason}>{shape}</HoverTooltip>;
}
