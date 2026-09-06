import { CircularProgress } from "@mui/material";

type LoadingSpinnerProps = {
  label: string;
};

/** The wait. One size everywhere, so nothing jumps when it appears. */
export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return <CircularProgress size={24} aria-label={label} />;
}
