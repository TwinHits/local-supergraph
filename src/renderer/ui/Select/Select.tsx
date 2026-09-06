import { MenuItem, Select as MuiSelect } from "@mui/material";

type SelectProps = {
  value: string;
  label: string;
  options: string[];
  onChange: (value: string) => void;
};

/** A dropdown over a fixed list of strings. */
export default function Select({
  value,
  label,
  options,
  onChange,
}: SelectProps) {
  return (
    <MuiSelect
      size="small"
      value={value}
      inputProps={{ "aria-label": label }}
      onChange={function report(event) {
        onChange(event.target.value);
      }}
    >
      {options.map(function toItem(option) {
        return (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        );
      })}
    </MuiSelect>
  );
}
