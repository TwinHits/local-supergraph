import { Tooltip as MuiTooltip } from "@mui/material";
import { type ReactElement } from "react";

const DEFAULT_ENTER_DELAY_MS = 1000;

type HoverTooltipProps = {
  title: string;
  enterDelayMs?: number;
  children: ReactElement;
};

/** One line of explanation on hover. */
export default function HoverTooltip({
  title,
  enterDelayMs,
  children,
}: HoverTooltipProps) {
  const enterDelay = enterDelayMs ?? DEFAULT_ENTER_DELAY_MS;
  return (
    <MuiTooltip title={title} enterDelay={enterDelay}>
      {children}
    </MuiTooltip>
  );
}
