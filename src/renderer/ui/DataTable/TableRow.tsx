import { TableRow as MuiTableRow } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/DataTable/TableRow.module.scss";

type TableRowProps = {
  children: ReactNode;
  highlighted?: boolean;
  faded?: boolean;
};

/** One line of a DataTable. */
export default function TableRow({
  children,
  highlighted,
  faded,
}: TableRowProps) {
  return (
    <MuiTableRow
      className={[
        styles.tableRow,
        highlighted === true ? styles["tableRow--highlighted"] : "",
        faded === true ? styles["tableRow--faded"] : "",
      ]
        .join(" ")
        .trim()}
    >
      {children}
    </MuiTableRow>
  );
}
