import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
import LoadingSpinner from "@/renderer/ui/LoadingSpinner";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

type LaunchControlProps = {
  state: SupergraphState;
  onStart: () => void;
  onStop: () => void;
};

/** Starts the supergraph and stops it again. */
export default function LaunchControl({
  state,
  onStart,
  onStop,
}: LaunchControlProps) {
  if (state === SupergraphState.Starting) {
    return <LoadingSpinner label="Starting supergraph" />;
  }

  if (state === SupergraphState.Running) {
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
