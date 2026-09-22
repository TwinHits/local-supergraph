import styles from "@/renderer/features/LaunchControl/LaunchControl.module.scss";
import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
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
    return (
      <IconButton
        label="Cancel starting the supergraph"
        tooltip="Composing"
        stretch
        onClick={onStop}
      >
        <span
          className={[
            styles.launchControl,
            styles["launchControl--starting"],
          ].join(" ")}
        >
          <IconGlyph name={IconName.Stop} size={IconSize.Large} />
        </span>
      </IconButton>
    );
  }

  if (state === SupergraphState.Running) {
    return (
      <IconButton
        label="Stop supergraph"
        tooltip="Stop"
        stretch
        onClick={onStop}
      >
        <span
          className={[
            styles.launchControl,
            styles["launchControl--running"],
          ].join(" ")}
        >
          <IconGlyph name={IconName.Stop} size={IconSize.Large} />
        </span>
      </IconButton>
    );
  }

  return (
    <IconButton
      label="Start supergraph"
      tooltip="Start"
      stretch
      onClick={onStart}
    >
      <span
        className={[
          styles.launchControl,
          styles["launchControl--stopped"],
        ].join(" ")}
      >
        <IconGlyph name={IconName.Start} size={IconSize.Large} />
      </span>
    </IconButton>
  );
}
