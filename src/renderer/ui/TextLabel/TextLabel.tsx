import { Typography } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/TextLabel/TextLabel.module.scss";

type TextLabelProps = {
  children: ReactNode;
  muted?: boolean;
  className?: string;
};

/** A line of text. */
export default function TextLabel({
  children,
  muted,
  className,
}: TextLabelProps) {
  return (
    <Typography
      className={[styles.textLabel, className].join(" ").trim()}
      component="span"
      variant="body1"
      color={muted === true ? "text.secondary" : "text.primary"}
    >
      {children}
    </Typography>
  );
}
