import { Tooltip as MuiTooltip } from "@mui/material";
import { type ReactElement } from "react";

const ENTER_DELAY_MS = 2500;

type HoverTooltipProps = {
  title: string;
  children: ReactElement;
};

/** One line of explanation on hover. */
export default function HoverTooltip({ title, children }: HoverTooltipProps) {
  return (
    <MuiTooltip title={title} enterDelay={ENTER_DELAY_MS}>
      {children}
    </MuiTooltip>
  );
}
