import { Typography } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/TextLabel/TextLabel.module.scss";

type TextLabelProps = {
  children: ReactNode;
  muted?: boolean;
};

/** Every line of copy in the app. */
export default function TextLabel({ children, muted }: TextLabelProps) {
  return (
    <Typography
      className={styles.textLabel}
      component="span"
      variant="body1"
      color={muted === true ? "text.secondary" : "text.primary"}
    >
      {children}
    </Typography>
  );
}
