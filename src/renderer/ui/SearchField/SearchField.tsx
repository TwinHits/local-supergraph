import TextField from "@/renderer/ui/TextField";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/** A search input. */
export default function SearchField({ value, onChange }: SearchFieldProps) {
  return <TextField value={value} label="Search" onChange={onChange} />;
}
