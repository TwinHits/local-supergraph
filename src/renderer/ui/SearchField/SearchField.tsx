import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
import styles from "@/renderer/ui/SearchField/SearchField.module.scss";
import TextField from "@/renderer/ui/TextField";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/** A search input with a clear button. */
export default function SearchField({ value, onChange }: SearchFieldProps) {
  const empty = value === "";

  return (
    <TextField
      value={value}
      ariaLabel="Search"
      onChange={onChange}
      startAdornment={<IconGlyph name={IconName.Search} />}
      endAdornment={
        <span
          className={empty ? styles["searchField__clear--hidden"] : undefined}
        >
          <IconButton
            label="Clear search"
            tooltip="Clear"
            variant={IconButtonVariant.Inline}
            disabled={empty}
            onClick={function clear() {
              onChange("");
            }}
          >
            <IconGlyph name={IconName.Close} />
          </IconButton>
        </span>
      }
    />
  );
}
