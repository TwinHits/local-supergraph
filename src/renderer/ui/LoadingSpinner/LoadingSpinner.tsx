import { CircularProgress } from "@mui/material";

type LoadingSpinnerProps = {
  label: string;
};

/** Shows that something is still loading. */
export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return <CircularProgress size={24} aria-label={label} />;
}
