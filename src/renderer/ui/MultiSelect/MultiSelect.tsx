import {
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select as MuiSelect,
} from "@mui/material";
import { useId } from "react";

type MultiSelectProps = {
  value: string[];
  label: string;
  options: string[];
  onChange: (value: string[]) => void;
};

/** A dropdown that selects any number of values from a fixed list, none meaning all. */
export default function MultiSelect({
  value,
  label,
  options,
  onChange,
}: MultiSelectProps) {
  const labelId = useId();

  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <MuiSelect
        labelId={labelId}
        label={label}
        multiple
        value={value}
        renderValue={function renderSelected(selected) {
          return selected.length === 0 ? "All" : selected.join(", ");
        }}
        onChange={function report(event) {
          const next = event.target.value;
          onChange(typeof next === "string" ? next.split(",") : next);
        }}
      >
        {options.map(function toItem(option) {
          return (
            <MenuItem key={option} value={option}>
              <Checkbox size="small" checked={value.includes(option)} />
              <ListItemText primary={option} />
            </MenuItem>
          );
        })}
      </MuiSelect>
    </FormControl>
  );
}
