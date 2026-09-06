import styles from "@/renderer/features/SubgraphTable/components/LocalUrlField/LocalUrlField.module.scss";
import NumberField from "@/renderer/ui/NumberField";
import Text from "@/renderer/ui/Text";

type LocalUrlFieldProps = {
  name: string;
  local: boolean;
  routingUrl: string;
  port: number | null;
  portError: string;
  onPortChange: (port: number | null) => void;
};

/** The URL cell: the Studio URL when remote, localhost and a port when local. */
export default function LocalUrlField({
  name,
  local,
  routingUrl,
  port,
  portError,
  onPortChange,
}: LocalUrlFieldProps) {
  if (!local) {
    return <Text muted>{routingUrl}</Text>;
  }

  return (
    <span className={styles.localUrlField}>
      <Text muted>localhost:</Text>
      <span className={styles.localUrlField__port}>
        <NumberField
          value={port}
          label={`${name} port`}
          error={portError}
          onChange={onPortChange}
        />
      </span>
    </span>
  );
}
