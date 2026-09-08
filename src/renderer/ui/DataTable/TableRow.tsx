import { TableRow as MuiTableRow } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/DataTable/TableRow.module.scss";

type TableRowProps = {
  children: ReactNode;
  highlighted?: boolean;
};

/** One line of a DataTable. */
export default function TableRow({ children, highlighted }: TableRowProps) {
  return (
    <MuiTableRow
      className={
        highlighted === true ? styles["tableRow--highlighted"] : undefined
      }
    >
      {children}
    </MuiTableRow>
  );
}
