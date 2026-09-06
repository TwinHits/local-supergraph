import Icon, { IconName } from "@/renderer/ui/Icon";
import IconButton from "@/renderer/ui/IconButton";
import styles from "@/renderer/ui/WindowControls/WindowControls.module.scss";

type WindowControlsProps = {
  maximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

/** Minimise, maximise and close, drawn by the app rather than the OS. */
export default function WindowControls({
  maximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) {
  return (
    <span className={styles.controls}>
      <IconButton label="Minimize" onClick={onMinimize}>
        <Icon name={IconName.Minimize} />
      </IconButton>
      <IconButton
        label={maximized ? "Restore" : "Maximize"}
        onClick={onToggleMaximize}
      >
        <Icon name={maximized ? IconName.Restore : IconName.Maximize} />
      </IconButton>
      <IconButton label="Close" onClick={onClose}>
        <Icon name={IconName.Close} />
      </IconButton>
    </span>
  );
}
