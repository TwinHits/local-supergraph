import LocalUrlField from "@/renderer/features/SubgraphTable/components/LocalUrlField";
import StatusIndicator from "@/renderer/features/SubgraphTable/components/StatusIndicator";
import { TableCell, TableRow } from "@/renderer/ui/DataTable";
import TextLabel from "@/renderer/ui/TextLabel";
import ToggleSwitch from "@/renderer/ui/ToggleSwitch";
import { type Row, RowStatus } from "@/shared/subgraph/subgraph.types";

type SubgraphRowProps = {
  row: Row;
  portError: string;
  onLocalChange: (local: boolean) => void;
  onPortChange: (port: number | null) => void;
  onShowErrors: () => void;
};

/** One subgraph: status, name, URL, and the local switch. */
export default function SubgraphRow({
  row,
  portError,
  onLocalChange,
  onPortChange,
  onShowErrors,
}: SubgraphRowProps) {
  return (
    <TableRow>
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
          name={row.name}
          local={row.local}
          routingUrl={row.routingUrl}
          port={row.port}
          portError={portError}
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
    </TableRow>
  );
}
