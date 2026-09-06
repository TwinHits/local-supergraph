import Table, { type Column } from "@/renderer/ui/Table";
import SearchField from "@/renderer/ui/SearchField";
import SubgraphRow from "@/renderer/features/SubgraphTable/components/SubgraphRow";
import Text from "@/renderer/ui/Text";
import { SortColumn, type Row } from "@/shared/subgraph/subgraph.types";
import styles from "@/renderer/features/SubgraphTable/SubgraphTable.module.scss";

/** The generic table speaks strings; only the sortable ones mean anything here. */
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
  { key: SortColumn.Local, label: "Local?", sortable: true },
];

type SubgraphTableProps = {
  rows: Row[];
  search: string;
  sort: SortColumn;
  portErrors: Record<string, string>;
  onSearchChange: (search: string) => void;
  onSortChange: (column: SortColumn) => void;
  onLocalChange: (name: string, local: boolean) => void;
  onPortChange: (name: string, port: number | null) => void;
  onShowErrors: (name: string) => void;
};

/** The main screen's table: one row per subgraph, searchable and sortable. */
export default function SubgraphTable({
  rows,
  search,
  sort,
  portErrors,
  onSearchChange,
  onSortChange,
  onLocalChange,
  onPortChange,
  onShowErrors,
}: SubgraphTableProps) {
  return (
    <div>
      <div className={styles.controls}>
        <SearchField value={search} onChange={onSearchChange} />
        <Text muted>{`${rows.length} subgraphs`}</Text>
      </div>
      <Table
        columns={COLUMNS}
        sortKey={sort}
        onSort={function sort(key) {
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
              portError={portErrors[row.name] ?? ""}
              onLocalChange={function setLocal(local) {
                onLocalChange(row.name, local);
              }}
              onPortChange={function setPort(port) {
                onPortChange(row.name, port);
              }}
              onShowErrors={function showErrors() {
                onShowErrors(row.name);
              }}
            />
          );
        })}
      </Table>
    </div>
  );
}
