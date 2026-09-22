import styles from "@/renderer/features/Databases/components/LocalPortField/LocalPortField.module.scss";
import NumberField from "@/renderer/ui/NumberField";
import TextLabel from "@/renderer/ui/TextLabel";

type LocalPortFieldProps = {
  port: number;
  onPortChange: (port: number) => void;
};

/** The local port a database's session forwards to, editable before connecting. */
export default function LocalPortField({
  port,
  onPortChange,
}: LocalPortFieldProps) {
  return (
    <span className={styles.localPortField}>
      <TextLabel muted>localhost:</TextLabel>
      <span className={styles.localPortField__port}>
        <NumberField
          value={port}
          onChange={function change(value) {
            if (value !== null) {
              onPortChange(value);
            }
          }}
        />
      </span>
    </span>
  );
}
