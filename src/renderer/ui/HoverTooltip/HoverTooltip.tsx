import { Tooltip as MuiTooltip } from "@mui/material";
import { type ReactElement } from "react";

// Long enough that a tooltip is something you ask for, not something that
// interrupts you crossing the toolbar.
const ENTER_DELAY_MS = 2500;

type HoverTooltipProps = {
  title: string;
  children: ReactElement;
};

/** One line of explanation, on hover. */
export default function HoverTooltip({ title, children }: HoverTooltipProps) {
  return (
    <MuiTooltip title={title} enterDelay={ENTER_DELAY_MS}>
      {children}
    </MuiTooltip>
  );
}
