import styles from "@/renderer/ui/CopyCommand/CopyCommand.module.scss";
import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";

type CopyCommandProps = {
  command: string;
  onCopy: (command: string) => void;
};

/** A command a signature defines, next to a button that copies it. */
export default function CopyCommand({ command, onCopy }: CopyCommandProps) {
  return (
    <div className={styles.copyCommand}>
      <code>{command}</code>
      <IconButton
        label="Copy command"
        tooltip="Copy command"
        onClick={function copy() {
          onCopy(command);
        }}
      >
        <IconGlyph name={IconName.Copy} />
      </IconButton>
    </div>
  );
}
