import { IconButton as MuiIconButton } from "@mui/material";
import { type ReactNode } from "react";

import HoverTooltip from "@/renderer/ui/HoverTooltip";
import styles from "@/renderer/ui/IconButton/IconButton.module.scss";
import {
  IconButtonSize,
  IconButtonVariant,
} from "@/renderer/ui/IconButton/IconButton.types";

const VARIANTS: Record<IconButtonVariant, string> = {
  [IconButtonVariant.Default]: "",
  [IconButtonVariant.Muted]: styles["iconButton--muted"],
  [IconButtonVariant.Inline]: styles["iconButton--inline"],
};

const SIZES: Record<IconButtonSize, string> = {
  [IconButtonSize.Medium]: "",
  [IconButtonSize.Small]: styles["iconButton--small"],
};

type IconButtonProps = {
  label: string;
  children: ReactNode;
  tooltip?: string;
  tooltipDelayMs?: number;
  disabled?: boolean;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Whether the button fills its parent's cross axis (a row's height, or a column's width) instead of sizing to its own content. */
  stretch: boolean;
  onClick: () => void;
};

/** A button that is only an icon. */
export default function IconButton({
  label,
  children,
  tooltip,
  tooltipDelayMs,
  disabled,
  variant,
  size,
  stretch,
  onClick,
}: IconButtonProps) {
  const stretchClass = stretch ? styles["iconButton--stretch"] : "";
  const look = [
    styles.iconButton,
    VARIANTS[variant ?? IconButtonVariant.Default],
    SIZES[size ?? IconButtonSize.Medium],
    stretchClass,
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
    <HoverTooltip title={tooltip} enterDelayMs={tooltipDelayMs}>
      <span
        className={[styles.iconButton__tooltip, stretchClass].join(" ").trim()}
      >
        {button}
      </span>
    </HoverTooltip>
  );
}
