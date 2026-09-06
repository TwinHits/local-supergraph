import { Typography } from "@mui/material";
import { type ReactNode } from "react";

type TextLabelProps = {
  children: ReactNode;
  muted?: boolean;
};

/** Every line of copy in the app. */
export default function TextLabel({ children, muted }: TextLabelProps) {
  return (
    <Typography
      component="span"
      variant="body2"
      color={muted === true ? "text.secondary" : "text.primary"}
    >
      {children}
    </Typography>
  );
}
