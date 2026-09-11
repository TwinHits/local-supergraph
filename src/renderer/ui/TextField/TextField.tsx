import { TextField as MuiTextField } from "@mui/material";
import { type ReactNode } from "react";

import { TextFieldSize } from "@/renderer/ui/TextField/TextField.types";

const MUI_SIZES: Record<TextFieldSize, "medium" | "small"> = {
  [TextFieldSize.Medium]: "medium",
  [TextFieldSize.Small]: "small",
};

type TextFieldProps = {
  value: string;
  label?: string;
  ariaLabel?: string;
  error?: string;
  size?: TextFieldSize;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  onChange: (value: string) => void;
};

/** A text input. */
export default function TextField({
  value,
  label,
  ariaLabel,
  error,
  size,
  startAdornment,
  endAdornment,
  onChange,
}: TextFieldProps) {
  const message = error ?? "";
  const resolvedSize = size ?? TextFieldSize.Small;
  return (
    <MuiTextField
      size={MUI_SIZES[resolvedSize]}
      variant="outlined"
      value={value}
      label={label}
      error={message !== ""}
      helperText={message}
      slotProps={{
        input: { startAdornment, endAdornment },
        htmlInput: { "aria-label": ariaLabel },
      }}
      onChange={function report(event) {
        onChange(event.target.value);
      }}
    />
  );
}
