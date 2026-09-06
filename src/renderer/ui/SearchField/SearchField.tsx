import TextField from "@/renderer/ui/TextField";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Filters the table on name and URL. */
export default function SearchField({ value, onChange }: SearchFieldProps) {
  return <TextField value={value} label="Search" onChange={onChange} />;
}
