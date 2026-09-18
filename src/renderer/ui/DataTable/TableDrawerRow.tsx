import {
  Collapse,
  TableCell as MuiTableCell,
  TableRow as MuiTableRow,
} from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/DataTable/TableDrawerRow.module.scss";

type TableDrawerRowProps = {
  expanded: boolean;
  columnCount: number;
  children: ReactNode;
};

/** An expandable panel spanning a DataTable row's full width. */
export default function TableDrawerRow({
  expanded,
  columnCount,
  children,
}: TableDrawerRowProps) {
  return (
    <MuiTableRow>
      <MuiTableCell
        className={styles.tableDrawerRow__cell}
        colSpan={columnCount}
      >
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <div className={styles.tableDrawerRow}>{children}</div>
        </Collapse>
      </MuiTableCell>
    </MuiTableRow>
  );
}
