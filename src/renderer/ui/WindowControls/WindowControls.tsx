import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import styles from "@/renderer/ui/WindowControls/WindowControls.module.scss";

type WindowControlsProps = {
  maximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

/** The window buttons the app draws instead of the OS. */
export default function WindowControls({
  maximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) {
  return (
    <span className={styles.windowControls}>
      <IconButton
        label="Minimize"
        variant={IconButtonVariant.Muted}
        stretch
        onClick={onMinimize}
      >
        <IconGlyph name={IconName.Minimize} size={IconSize.Large} />
      </IconButton>
      <IconButton
        label={maximized ? "Restore" : "Maximize"}
        variant={IconButtonVariant.Muted}
        stretch
        onClick={onToggleMaximize}
      >
        <IconGlyph
          name={maximized ? IconName.Restore : IconName.Maximize}
          size={IconSize.Large}
        />
      </IconButton>
      <IconButton
        label="Close"
        variant={IconButtonVariant.Muted}
        stretch
        onClick={onClose}
      >
        <IconGlyph name={IconName.Close} size={IconSize.Large} />
      </IconButton>
    </span>
  );
}
