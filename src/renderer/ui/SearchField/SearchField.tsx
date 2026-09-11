import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
import TextField from "@/renderer/ui/TextField";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/** A search input, with a clear button that appears once there's something to clear. */
export default function SearchField({ value, onChange }: SearchFieldProps) {
  return (
    <TextField
      value={value}
      ariaLabel="Search"
      onChange={onChange}
      startAdornment={<IconGlyph name={IconName.Search} />}
      endAdornment={
        value === "" ? undefined : (
          <IconButton
            label="Clear search"
            tooltip="Clear"
            variant={IconButtonVariant.Inline}
            onClick={function clear() {
              onChange("");
            }}
          >
            <IconGlyph name={IconName.Close} />
          </IconButton>
        )
      }
    />
  );
}
