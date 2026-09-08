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
    return (
      <div className={styles.rawOutput__wrapper}>
        <pre className={styles.rawOutput}>{raw}</pre>
      </div>
    );
  }
  return (
    <CollapsiblePanel label="More info">
      <div className={styles.rawOutput__wrapper}>
        <pre className={styles.rawOutput}>{raw}</pre>
      </div>
    </CollapsiblePanel>
  );
}
