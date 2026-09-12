import SubgraphRow from "@/renderer/features/SubgraphTable/components/SubgraphRow";
import DataTable, { type Column } from "@/renderer/ui/DataTable";
import { type Row, SortColumn } from "@/shared/subgraph/subgraph.types";

type SubgraphTableProps = {
  rows: Row[];
  sort: SortColumn;
  supergraphRunning: boolean;
  onSortChange: (column: SortColumn) => void;
  onLocalChange: (name: string, local: boolean) => void;
  onPortChange: (name: string, port: number | null) => void;
  onEnabledChange: (name: string, enabled: boolean) => void;
  onShowErrors: (name: string) => void;
};

/** Reads a sortable column out of the table's plain key. */
function toSortColumn(key: string): SortColumn | null {
  const known = [SortColumn.Status, SortColumn.Name, SortColumn.Local];
  return (
    known.find(function matches(column) {
      return column === key;
    }) ?? null
  );
}

const COLUMNS: Column[] = [
  { key: SortColumn.Status, label: "Status", sortable: true },
  { key: SortColumn.Name, label: "Name", sortable: true },
  { key: "url", label: "URL", sortable: false },
  { key: SortColumn.Local, label: "Local", sortable: true },
  { key: "enabled", label: "Enabled", sortable: false },
];

/** One sortable row per subgraph. */
export default function SubgraphTable({
  rows,
  sort,
  supergraphRunning,
  onSortChange,
  onLocalChange,
  onPortChange,
  onEnabledChange,
  onShowErrors,
}: SubgraphTableProps) {
  return (
    <DataTable
      columns={COLUMNS}
      sortKey={sort}
      onSort={function sortBy(key) {
        const column = toSortColumn(key);
        if (column !== null) {
          onSortChange(column);
        }
      }}
    >
      {rows.map(function toRow(row) {
        return (
          <SubgraphRow
            key={row.name}
            row={row}
            supergraphRunning={supergraphRunning}
            onLocalChange={function setLocal(local) {
              onLocalChange(row.name, local);
            }}
            onPortChange={function setPort(port) {
              onPortChange(row.name, port);
            }}
            onEnabledChange={function setEnabled(enabled) {
              onEnabledChange(row.name, enabled);
            }}
            onShowErrors={function show() {
              onShowErrors(row.name);
            }}
          />
        );
      })}
    </DataTable>
  );
}
