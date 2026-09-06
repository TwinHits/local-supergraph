import { TextField as MuiTextField } from "@mui/material";

type TextFieldProps = {
  value: string;
  label: string;
  error?: string;
  onChange: (value: string) => void;
};

/** Every text input: one size, one variant, errors shown the same way. */
export default function TextField({
  value,
  label,
  error,
  onChange,
}: TextFieldProps) {
  const message = error ?? "";
  return (
    <MuiTextField
      size="small"
      variant="outlined"
      value={value}
      label={label}
      error={message !== ""}
      helperText={message}
      onChange={function report(event) {
        onChange(event.target.value);
      }}
    />
  );
}
