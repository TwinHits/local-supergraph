import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
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
    <span className={styles.windowControls}>
      <IconButton label="Minimize" onClick={onMinimize}>
        <IconGlyph name={IconName.Minimize} />
      </IconButton>
      <IconButton
        label={maximized ? "Restore" : "Maximize"}
        onClick={onToggleMaximize}
      >
        <IconGlyph name={maximized ? IconName.Restore : IconName.Maximize} />
      </IconButton>
      <IconButton label="Close" onClick={onClose}>
        <IconGlyph name={IconName.Close} />
      </IconButton>
    </span>
  );
}
