import LocalUrlField from "@/renderer/features/SubgraphTable/components/LocalUrlField";
import StatusIndicator from "@/renderer/features/SubgraphTable/components/StatusIndicator";
import { Cell, Row as TableRow } from "@/renderer/ui/Table";
import Text from "@/renderer/ui/Text";
import Toggle from "@/renderer/ui/Toggle";
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
      <Cell>
        <StatusIndicator
          status={row.status}
          reason={row.reason}
          onClick={row.status === RowStatus.Failed ? onShowErrors : undefined}
        />
      </Cell>
      <Cell>
        <Text>{row.name}</Text>
      </Cell>
      <Cell>
        <LocalUrlField
          name={row.name}
          local={row.local}
          routingUrl={row.routingUrl}
          port={row.port}
          portError={portError}
          onPortChange={onPortChange}
        />
      </Cell>
      <Cell>
        <Toggle
          checked={row.local}
          label={`Run ${row.name} locally`}
          onChange={onLocalChange}
        />
      </Cell>
    </TableRow>
  );
}
