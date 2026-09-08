import TextField, { type TextFieldSize } from "@/renderer/ui/TextField";

type NumberFieldProps = {
  value: number | null;
  label?: string;
  error?: string;
  size?: TextFieldSize;
  onChange: (value: number | null) => void;
};

/** An input that takes a number or nothing. */
export default function NumberField({
  value,
  label,
  error,
  size,
  onChange,
}: NumberFieldProps) {
  return (
    <TextField
      value={value === null ? "" : String(value)}
      label={label}
      error={error}
      size={size}
      onChange={function toNumber(text) {
        const digits = text.replace(/\D/g, "");
        onChange(digits === "" ? null : Number(digits));
      }}
    />
  );
}
