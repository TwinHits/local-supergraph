import styles from "@/renderer/features/SubgraphTable/components/LocalUrlField/LocalUrlField.module.scss";
import NumberField from "@/renderer/ui/NumberField";
import TextLabel from "@/renderer/ui/TextLabel";

type LocalUrlFieldProps = {
  local: boolean;
  routingUrl: string;
  port: number | null;
  onPortChange: (port: number | null) => void;
};

/** Shows the routing URL when a subgraph is remote and a port when it is local. */
export default function LocalUrlField({
  local,
  routingUrl,
  port,
  onPortChange,
}: LocalUrlFieldProps) {
  if (!local) {
    return <TextLabel muted>{routingUrl}</TextLabel>;
  }

  return (
    <span className={styles.localUrlField}>
      <TextLabel muted>localhost:</TextLabel>
      <span className={styles.localUrlField__port}>
        <NumberField value={port} onChange={onPortChange} />
      </span>
    </span>
  );
}
