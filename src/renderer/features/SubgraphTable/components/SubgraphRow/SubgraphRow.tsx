import LocalUrlField from "@/renderer/features/SubgraphTable/components/LocalUrlField";
import StatusIndicator from "@/renderer/features/SubgraphTable/components/StatusIndicator";
import { TableCell, TableRow } from "@/renderer/ui/DataTable";
import TextLabel from "@/renderer/ui/TextLabel";
import ToggleSwitch from "@/renderer/ui/ToggleSwitch";
import { type Row, RowStatus } from "@/shared/subgraph/subgraph.types";

type SubgraphRowProps = {
  row: Row;
  onLocalChange: (local: boolean) => void;
  onPortChange: (port: number | null) => void;
  onEnabledChange: (enabled: boolean) => void;
  onShowErrors: () => void;
};

/** One line of the table for one subgraph. */
export default function SubgraphRow({
  row,
  onLocalChange,
  onPortChange,
  onEnabledChange,
  onShowErrors,
}: SubgraphRowProps) {
  return (
    <TableRow highlighted={row.local} faded={!row.enabled}>
      <TableCell>
        <StatusIndicator
          status={row.status}
          reason={row.reason}
          onClick={row.status === RowStatus.Failed ? onShowErrors : undefined}
        />
      </TableCell>
      <TableCell>
        <TextLabel>{row.name}</TextLabel>
      </TableCell>
      <TableCell>
        <LocalUrlField
          local={row.local}
          routingUrl={row.routingUrl}
          port={row.port}
          onPortChange={onPortChange}
        />
      </TableCell>
      <TableCell>
        <ToggleSwitch
          checked={row.local}
          label={`Run ${row.name} locally`}
          onChange={onLocalChange}
        />
      </TableCell>
      <TableCell>
        <ToggleSwitch
          checked={row.enabled}
          label={`Include ${row.name} in the supergraph`}
          onChange={onEnabledChange}
        />
      </TableCell>
    </TableRow>
  );
}
