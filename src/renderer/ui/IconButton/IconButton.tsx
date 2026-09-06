import { IconButton as MuiIconButton } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/IconButton/IconButton.module.scss";
import Tooltip from "@/renderer/ui/Tooltip";

type IconButtonProps = {
  label: string;
  children: ReactNode;
  tooltip?: string;
  disabled?: boolean;
  onClick: () => void;
};

/** Every icon-only button, in the one shape the app uses. */
export default function IconButton({
  label,
  children,
  tooltip,
  disabled,
  onClick,
}: IconButtonProps) {
  const button = (
    <MuiIconButton
      className={styles.button}
      aria-label={label}
      disableRipple
      disabled={disabled === true}
      onClick={onClick}
    >
      {children}
    </MuiIconButton>
  );

  if (tooltip === undefined) {
    return button;
  }

  // A disabled button fires no events, so the tooltip needs a wrapper to hear.
  return (
    <Tooltip title={tooltip}>
      <span>{button}</span>
    </Tooltip>
  );
}
