import { Button as MuiButton } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/ActionButton/ActionButton.module.scss";
import {
  ButtonSize,
  ButtonVariant,
} from "@/renderer/ui/ActionButton/ActionButton.types";

const MUI_SIZES: Record<ButtonSize, "medium" | "small"> = {
  [ButtonSize.Medium]: "medium",
  [ButtonSize.Small]: "small",
};

const MUI_VARIANTS: Record<ButtonVariant, "contained" | "outlined"> = {
  [ButtonVariant.Primary]: "contained",
  [ButtonVariant.Secondary]: "outlined",
};

type ActionButtonProps = {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  startIcon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

/** A button with a label on it. */
export default function ActionButton({
  children,
  size,
  variant,
  startIcon,
  onClick,
  disabled,
}: ActionButtonProps) {
  const resolvedSize = size ?? ButtonSize.Small;
  return (
    <MuiButton
      variant={MUI_VARIANTS[variant ?? ButtonVariant.Primary]}
      size={MUI_SIZES[resolvedSize]}
      startIcon={startIcon}
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
