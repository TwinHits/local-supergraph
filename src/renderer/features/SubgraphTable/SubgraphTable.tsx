import SubgraphRow from "@/renderer/features/SubgraphTable/components/SubgraphRow";
import styles from "@/renderer/features/SubgraphTable/SubgraphTable.module.scss";
import DataTable, { type Column } from "@/renderer/ui/DataTable";
import SearchField from "@/renderer/ui/SearchField";
import { type Row, SortColumn } from "@/shared/subgraph/subgraph.types";

type SubgraphTableProps = {
  rows: Row[];
  error: string;
  search: string;
  sort: SortColumn;
  portErrors: Record<string, string>;
  onSearchChange: (search: string) => void;
  onSortChange: (column: SortColumn) => void;
  onLocalChange: (name: string, local: boolean) => void;
  onPortChange: (name: string, port: number | null) => void;
  onShowErrors: (name: string) => void;
};

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
  { key: SortColumn.Local, label: "Local", sortable: true },
];

/** One row per subgraph, searchable and sortable. */
export default function SubgraphTable({
  rows,
  error,
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
      <div className={styles.subgraphTable__controls}>
        <SearchField value={search} onChange={onSearchChange} />
      </div>
      {error === "" ? null : (
        <p className={styles.subgraphTable__error}>{error}</p>
      )}
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
              portError={portErrors[row.name] ?? ""}
              onLocalChange={function setLocal(local) {
                onLocalChange(row.name, local);
              }}
              onPortChange={function setPort(port) {
                onPortChange(row.name, port);
              }}
              onShowErrors={function show() {
                onShowErrors(row.name);
              }}
            />
          );
        })}
      </DataTable>
    </div>
  );
}
