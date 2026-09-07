import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
import LoadingSpinner from "@/renderer/ui/LoadingSpinner";

export enum RouterState {
  Stopped = "stopped",
  Starting = "starting",
  Running = "running",
}

type LaunchControlProps = {
  state: RouterState;
  onStart: () => void;
  onStop: () => void;
};

/** Starts the supergraph and stops it again. */
export default function LaunchControl({
  state,
  onStart,
  onStop,
}: LaunchControlProps) {
  if (state === RouterState.Starting) {
    return <LoadingSpinner label="Starting supergraph" />;
  }

  if (state === RouterState.Running) {
    return (
      <IconButton
        label="Stop supergraph"
        tooltip="Stop supergraph"
        busy
        variant={IconButtonVariant.Running}
        onClick={onStop}
      >
        <IconGlyph name={IconName.Stop} />
      </IconButton>
    );
  }

  return (
    <IconButton
      label="Start supergraph"
      tooltip="Start supergraph"
      onClick={onStart}
    >
      <IconGlyph name={IconName.Start} />
    </IconButton>
  );
}
