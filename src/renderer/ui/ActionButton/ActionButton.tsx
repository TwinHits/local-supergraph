import { Button as MuiButton } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/ActionButton/ActionButton.module.scss";
import { ButtonSize } from "@/renderer/ui/ActionButton/ActionButton.types";

const MUI_SIZES: Record<ButtonSize, "medium" | "small"> = {
  [ButtonSize.Medium]: "medium",
  [ButtonSize.Small]: "small",
};

type ActionButtonProps = {
  children: ReactNode;
  size?: ButtonSize;
  onClick: () => void;
  disabled?: boolean;
};

/** A button with a label on it. */
export default function ActionButton({
  children,
  size,
  onClick,
  disabled,
}: ActionButtonProps) {
  const resolvedSize = size ?? ButtonSize.Small;
  return (
    <MuiButton
      variant="contained"
      size={MUI_SIZES[resolvedSize]}
      disableElevation
      className={
        resolvedSize === ButtonSize.Small
          ? styles["actionButton--small"]
          : undefined
      }
      onClick={onClick}
      disabled={disabled === true}
    >
      {children}
    </MuiButton>
  );
}
