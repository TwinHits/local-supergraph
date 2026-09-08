import { Collapse as MuiCollapse } from "@mui/material";
import { type ReactNode } from "react";

type CollapseProps = {
  in: boolean;
  children: ReactNode;
};

/** Animates its child open and shut. */
export default function Collapse({ in: open, children }: CollapseProps) {
  return <MuiCollapse in={open}>{children}</MuiCollapse>;
}
