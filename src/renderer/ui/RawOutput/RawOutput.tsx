import Collapsible from "@/renderer/ui/Collapsible";
import styles from "@/renderer/ui/RawOutput/RawOutput.module.scss";

type RawOutputProps = {
  raw: string;
  startOpen: boolean;
};

/** The unparsed error text. Collapsed for a known error, shown for an unknown one. */
export default function RawOutput({ raw, startOpen }: RawOutputProps) {
  if (raw === "") {
    return null;
  }
  if (startOpen) {
    return <pre className={styles.output}>{raw}</pre>;
  }
  return (
    <Collapsible label="More info">
      <pre className={styles.output}>{raw}</pre>
    </Collapsible>
  );
}
