import { Tooltip as MuiTooltip } from "@mui/material";
import { type ReactElement } from "react";

type TooltipProps = {
  title: string;
  children: ReactElement;
};

/** One line of explanation, on hover. */
export default function Tooltip({ title, children }: TooltipProps) {
  return <MuiTooltip title={title}>{children}</MuiTooltip>;
}
