import { TableRow as MuiTableRow } from "@mui/material";
import { type ReactNode } from "react";

type TableRowProps = {
  children: ReactNode;
};

/** One line of a DataTable. */
export default function TableRow({ children }: TableRowProps) {
  return <MuiTableRow>{children}</MuiTableRow>;
}
