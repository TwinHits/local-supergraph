import styles from "@/renderer/features/Databases/components/ConnectionStatusIndicator/ConnectionStatusIndicator.module.scss";
import HoverTooltip from "@/renderer/ui/HoverTooltip";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";

type ConnectionStatusIndicatorProps = {
  state: DatabaseConnectionState;
  /** This row's own current error, if it has one. */
  reason: string | null;
};

const SHAPES: Record<DatabaseConnectionState, string> = {
  [DatabaseConnectionState.Disconnected]:
    styles["connectionStatusIndicator--disconnected"],
  [DatabaseConnectionState.Connecting]:
    styles["connectionStatusIndicator--connecting"],
  [DatabaseConnectionState.Connected]:
    styles["connectionStatusIndicator--connected"],
};

/** What disconnected, connecting and connected look like for one database row. */
export default function ConnectionStatusIndicator({
  state,
  reason,
}: ConnectionStatusIndicatorProps) {
  const shape = (
    <span
      role="img"
      aria-label={reason === null ? state : `${state}: ${reason}`}
      className={[styles.connectionStatusIndicator, SHAPES[state]]
        .join(" ")
        .trim()}
    />
  );

  if (reason === null) {
    return shape;
  }

  return <HoverTooltip title={reason}>{shape}</HoverTooltip>;
}
