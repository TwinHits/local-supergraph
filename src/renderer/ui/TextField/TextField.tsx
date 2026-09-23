import { TextField as MuiTextField } from "@mui/material";
import { type ReactNode } from "react";

import { TextFieldSize } from "@/renderer/ui/TextField/TextField.types";

const MUI_SIZES: Record<TextFieldSize, "medium" | "small"> = {
  [TextFieldSize.Medium]: "medium",
  [TextFieldSize.Small]: "small",
};

const MASKED_TYPE = "password";
const PLAIN_TYPE = "text";

type TextFieldProps = {
  value: string;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  error?: string;
  size?: TextFieldSize;
  masked?: boolean;
  disabled?: boolean;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  onChange: (value: string) => void;
};

/** A text input. */
export default function TextField({
  value,
  label,
  ariaLabel,
  placeholder,
  error,
  size,
  masked,
  disabled,
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
      type={masked === true ? MASKED_TYPE : PLAIN_TYPE}
      value={value}
      label={label}
      placeholder={placeholder}
      disabled={disabled === true}
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
