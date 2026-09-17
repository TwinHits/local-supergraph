import { TableCell as MuiTableCell } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/DataTable/TableCell.module.scss";

type TableCellProps = {
  children: ReactNode;
};

/** One cell of a TableRow. */
export default function TableCell({ children }: TableCellProps) {
  return (
    <MuiTableCell className={styles.tableCell}>
      <span className={styles.tableCell__inner}>{children}</span>
    </MuiTableCell>
  );
}
