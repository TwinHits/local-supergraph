import { TableCell } from "@mui/material";
import { type ReactNode } from "react";

type CellProps = {
  children: ReactNode;
};

/** One cell of a Row. */
export default function Cell({ children }: CellProps) {
  return <TableCell>{children}</TableCell>;
}
