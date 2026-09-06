import { CircularProgress } from "@mui/material";

type SpinnerProps = {
  label: string;
};

/** The wait. One size everywhere, so nothing jumps when it appears. */
export default function Spinner({ label }: SpinnerProps) {
  return <CircularProgress size={24} aria-label={label} />;
}
