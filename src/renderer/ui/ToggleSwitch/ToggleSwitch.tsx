import { Switch } from "@mui/material";

type ToggleSwitchProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

/** An on/off switch. */
export default function ToggleSwitch({
  checked,
  label,
  onChange,
}: ToggleSwitchProps) {
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
