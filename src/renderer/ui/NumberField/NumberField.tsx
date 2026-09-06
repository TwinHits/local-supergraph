import TextField from "@/renderer/ui/TextField";

type NumberFieldProps = {
  value: number | null;
  label: string;
  error?: string;
  onChange: (value: number | null) => void;
};

/** MUI has no number input, so this adds the numeric rules to our TextField. */
export default function NumberField({
  value,
  label,
  error,
  onChange,
}: NumberFieldProps) {
  return (
    <TextField
      value={value === null ? "" : String(value)}
      label={label}
      error={error}
      onChange={function toNumber(text) {
        const digits = text.replace(/\D/g, "");
        onChange(digits === "" ? null : Number(digits));
      }}
    />
  );
}
