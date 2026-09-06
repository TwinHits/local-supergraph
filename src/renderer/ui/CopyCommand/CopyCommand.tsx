import Icon, { IconName } from "@/renderer/ui/Icon";
import IconAction from "@/renderer/ui/IconAction";
import styles from "@/renderer/ui/CopyCommand/CopyCommand.module.scss";

type CopyCommandProps = {
  command: string;
  onCopy: (command: string) => void;
};

/** A command a signature defines, next to a button that copies it. */
export default function CopyCommand({ command, onCopy }: CopyCommandProps) {
  return (
    <div className={styles.command}>
      <code>{command}</code>
      <IconAction
        label="Copy command"
        onClick={function copy() {
          onCopy(command);
        }}
      >
        <Icon name={IconName.Copy} />
      </IconAction>
    </div>
  );
}
