import { IconButton as MuiIconButton } from "@mui/material";
import { type ReactNode } from "react";

import HoverTooltip from "@/renderer/ui/HoverTooltip";
import styles from "@/renderer/ui/IconButton/IconButton.module.scss";
import { IconButtonVariant } from "@/renderer/ui/IconButton/IconButton.types";

const VARIANTS: Record<IconButtonVariant, string> = {
  [IconButtonVariant.Default]: "",
  [IconButtonVariant.Muted]: styles["iconButton--muted"],
};

type IconButtonProps = {
  label: string;
  children: ReactNode;
  tooltip?: string;
  disabled?: boolean;
  busy?: boolean;
  variant?: IconButtonVariant;
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
  variant,
  onClick,
}: IconButtonProps) {
  const look = [
    styles.iconButton,
    VARIANTS[variant ?? IconButtonVariant.Default],
    busy === true ? styles["iconButton--busy"] : "",
  ]
    .join(" ")
    .trim();
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
