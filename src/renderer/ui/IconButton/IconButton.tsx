import { IconButton as MuiIconButton } from "@mui/material";
import { type ReactNode } from "react";

import HoverTooltip from "@/renderer/ui/HoverTooltip";
import styles from "@/renderer/ui/IconButton/IconButton.module.scss";

type IconButtonProps = {
  label: string;
  children: ReactNode;
  tooltip?: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
};

/** Every icon-only button, in the one shape the app uses. Busy adds a ring for
 * work this button started that is still going. */
export default function IconButton({
  label,
  children,
  tooltip,
  disabled,
  busy,
  onClick,
}: IconButtonProps) {
  const look =
    busy === true
      ? `${styles.iconButton} ${styles["iconButton--busy"]}`
      : styles.iconButton;
  const button = (
    <MuiIconButton
      className={look}
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

  return (
    <HoverTooltip title={tooltip}>
      <span className={styles.iconButton__tooltip}>{button}</span>
    </HoverTooltip>
  );
}
