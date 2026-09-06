import styles from "@/renderer/ui/CopyCommand/CopyCommand.module.scss";
import Icon, { IconName } from "@/renderer/ui/Icon";
import IconButton from "@/renderer/ui/IconButton";

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
        <Icon name={IconName.Copy} />
      </IconButton>
    </div>
  );
}
