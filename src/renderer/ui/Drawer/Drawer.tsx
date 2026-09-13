import { Drawer as MuiDrawer } from "@mui/material";
import { type ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  paperClassName?: string;
  children: ReactNode;
};

/** A panel pinned to the bottom of the viewport, over whatever is beneath it. */
export default function Drawer({
  open,
  paperClassName,
  children,
}: DrawerProps) {
  return (
    <MuiDrawer
      anchor="bottom"
      variant="persistent"
      open={open}
      classes={{ paper: paperClassName }}
    >
      {children}
    </MuiDrawer>
  );
}
