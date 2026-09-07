import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableHead,
  TableRow as MuiTableRow,
  TableSortLabel,
} from "@mui/material";
import { type ReactNode } from "react";

export type Column = {
  key: string;
  label: string;
  sortable: boolean;
};

type DataTableProps = {
  columns: Column[];
  sortKey: string;
  children: ReactNode;
  onSort: (key: string) => void;
};

/** A sortable table. */
export default function DataTable({
  columns,
  sortKey,
  children,
  onSort,
}: DataTableProps) {
  return (
    <MuiTable size="small">
      <TableHead>
        <MuiTableRow>
          {columns.map(function toHeading(column) {
            return (
              <TableCell key={column.key}>
                {column.sortable ? (
                  <TableSortLabel
                    active={sortKey === column.key}
                    onClick={function sort() {
                      onSort(column.key);
                    }}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            );
          })}
        </MuiTableRow>
      </TableHead>
      <TableBody>{children}</TableBody>
    </MuiTable>
  );
}
