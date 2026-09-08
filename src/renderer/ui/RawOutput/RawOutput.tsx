import CollapsiblePanel from "@/renderer/ui/CollapsiblePanel";
import styles from "@/renderer/ui/RawOutput/RawOutput.module.scss";

type RawOutputProps = {
  raw: string | null;
  startOpen: boolean;
};

/** Unparsed output the caller can show or collapse. */
export default function RawOutput({ raw, startOpen }: RawOutputProps) {
  if (raw === null) {
    return null;
  }
  if (startOpen) {
    return <pre className={styles.rawOutput}>{raw}</pre>;
  }
  return (
    <CollapsiblePanel label="More info">
      <pre className={styles.rawOutput}>{raw}</pre>
    </CollapsiblePanel>
  );
}
