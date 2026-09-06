import { Button as MuiButton } from "@mui/material";
import { type ReactNode } from "react";

type ActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

/** The one button in the app: every caller gets this size and this variant. */
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
