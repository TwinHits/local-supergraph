import styles from "@/renderer/features/Databases/components/ConnectionControl/ConnectionControl.module.scss";
import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";

type ConnectionControlProps = {
  state: DatabaseConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
};

/** Opens and closes the database's port-forwarding session. */
export default function ConnectionControl({
  state,
  onConnect,
  onDisconnect,
}: ConnectionControlProps) {
  if (state === DatabaseConnectionState.Connecting) {
    return (
      <IconButton
        label="Cancel connecting to the database"
        tooltip="Connecting"
        onClick={onDisconnect}
      >
        <span
          className={[
            styles.connectionControl,
            styles["connectionControl--connecting"],
          ].join(" ")}
        >
          <IconGlyph name={IconName.Stop} />
        </span>
      </IconButton>
    );
  }

  if (state === DatabaseConnectionState.Connected) {
    return (
      <IconButton
        label="Disconnect from the database"
        tooltip="Disconnect"
        onClick={onDisconnect}
      >
        <span
          className={[
            styles.connectionControl,
            styles["connectionControl--connected"],
          ].join(" ")}
        >
          <IconGlyph name={IconName.Stop} />
        </span>
      </IconButton>
    );
  }

  return (
    <IconButton
      label="Connect to the database"
      tooltip="Connect"
      onClick={onConnect}
    >
      <span
        className={[
          styles.connectionControl,
          styles["connectionControl--disconnected"],
        ].join(" ")}
      >
        <IconGlyph name={IconName.Start} />
      </span>
    </IconButton>
  );
}
