import { TableRow } from "@mui/material";
import { type ReactNode } from "react";

type RowProps = {
  children: ReactNode;
};

/** One line of a Table. */
export default function Row({ children }: RowProps) {
  return <TableRow>{children}</TableRow>;
}
