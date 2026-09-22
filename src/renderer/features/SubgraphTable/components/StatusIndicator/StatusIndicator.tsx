import StatusIndicator, { StatusTone } from "@/renderer/ui/StatusIndicator";
import { RowStatus } from "@/shared/subgraph/subgraph.types";

type SubgraphStatusIndicatorProps = {
  status: RowStatus;
  reason: string;
  running?: boolean;
  onClick?: () => void;
};

const TONES: Record<RowStatus, StatusTone> = {
  [RowStatus.Pending]: StatusTone.Pending,
  [RowStatus.Healthy]: StatusTone.Healthy,
  [RowStatus.Failed]: StatusTone.Failed,
};

/** A subgraph's status dot, silent when healthy since there's nothing to tell. */
export default function SubgraphStatusIndicator({
  status,
  reason,
  running,
  onClick,
}: SubgraphStatusIndicatorProps) {
  return (
    <StatusIndicator
      tone={TONES[status]}
      label={status}
      reason={status === RowStatus.Healthy ? null : reason}
      running={running}
      onClick={onClick}
    />
  );
}
