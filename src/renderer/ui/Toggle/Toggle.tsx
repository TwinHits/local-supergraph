import { Switch } from "@mui/material";

type ToggleProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

/** The local/remote switch on a subgraph row. */
export default function Toggle({ checked, label, onChange }: ToggleProps) {
  return (
    <Switch
      size="small"
      checked={checked}
      slotProps={{ input: { "aria-label": label } }}
      onChange={function report(event) {
        onChange(event.target.checked);
      }}
    />
  );
}
