import { MenuItem, Select as MuiSelect } from "@mui/material";

import styles from "@/renderer/ui/DropdownSelect/DropdownSelect.module.scss";

type DropdownSelectProps = {
  value: string;
  label: string;
  options: string[];
  onChange: (value: string) => void;
};

/** A dropdown over a fixed list of strings. */
export default function DropdownSelect({
  value,
  label,
  options,
  onChange,
}: DropdownSelectProps) {
  return (
    <MuiSelect
      className={styles.dropdownSelect}
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
