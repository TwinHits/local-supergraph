import StatusIndicator, { StatusTone } from "@/renderer/ui/StatusIndicator";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";

type ConnectionStatusIndicatorProps = {
  state: DatabaseConnectionState;
  /** This row's own current error, if it has one. */
  reason: string | null;
  onClick?: () => void;
};

const TONES: Record<DatabaseConnectionState, StatusTone> = {
  [DatabaseConnectionState.Disconnected]: StatusTone.Idle,
  [DatabaseConnectionState.Connecting]: StatusTone.Pending,
  [DatabaseConnectionState.Connected]: StatusTone.Healthy,
};

/** A database row's connection status dot, red whenever it has a reported error. */
export default function ConnectionStatusIndicator({
  state,
  reason,
  onClick,
}: ConnectionStatusIndicatorProps) {
  const tone = reason === null ? TONES[state] : StatusTone.Failed;
  return (
    <StatusIndicator
      tone={tone}
      label={state}
      reason={reason}
      onClick={reason === null ? undefined : onClick}
    />
  );
}
