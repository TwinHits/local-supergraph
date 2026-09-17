import styles from "@/renderer/features/Databases/components/ConnectionStatusIndicator/ConnectionStatusIndicator.module.scss";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";

type ConnectionStatusIndicatorProps = {
  state: DatabaseConnectionState;
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
}: ConnectionStatusIndicatorProps) {
  return (
    <span
      role="img"
      aria-label={state}
      className={[styles.connectionStatusIndicator, SHAPES[state]]
        .join(" ")
        .trim()}
    />
  );
}
