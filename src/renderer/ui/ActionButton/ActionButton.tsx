import { Button as MuiButton } from "@mui/material";
import { type ReactNode } from "react";

type ActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

/** A button with a label on it. */
export default function ActionButton({
  children,
  onClick,
  disabled,
}: ActionButtonProps) {
  return (
    <MuiButton
      variant="contained"
      size="medium"
      disableElevation
      onClick={onClick}
      disabled={disabled === true}
    >
      {children}
    </MuiButton>
  );
}
