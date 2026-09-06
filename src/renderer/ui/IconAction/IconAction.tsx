import { IconButton, Tooltip } from "@mui/material";
import { type ReactNode } from "react";

type IconActionProps = {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  large?: boolean;
  onClick: () => void;
};

/** An icon that does something, and says what it does. */
export default function IconAction({
  label,
  children,
  disabled,
  large,
  onClick,
}: IconActionProps) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size={large === true ? "large" : "small"}
          aria-label={label}
          disabled={disabled === true}
          onClick={onClick}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
