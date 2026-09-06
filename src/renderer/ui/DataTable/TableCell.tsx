import { TableCell as MuiTableCell } from "@mui/material";
import { type ReactNode } from "react";

type TableCellProps = {
  children: ReactNode;
};

/** One cell of a TableRow. */
export default function TableCell({ children }: TableCellProps) {
  return <MuiTableCell>{children}</MuiTableCell>;
}
