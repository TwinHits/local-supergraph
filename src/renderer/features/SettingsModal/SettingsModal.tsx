import styles from "@/renderer/features/SettingsModal/SettingsModal.module.scss";
import ModalDialog from "@/renderer/ui/ModalDialog";
import NumberField from "@/renderer/ui/NumberField";
import { TextFieldSize } from "@/renderer/ui/TextField";
import { type Settings } from "@/shared/settings/settings.types";

type SettingsModalProps = {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
};

/** The dialog for settings that already have a default. */
export default function SettingsModal({
  open,
  settings,
  onChange,
  onClose,
}: SettingsModalProps) {
  return (
    <ModalDialog open={open} title="Settings" onClose={onClose}>
      <div className={styles.settingsModal__fields}>
        <NumberField
          value={settings.routerPort}
          label="Router port"
          size={TextFieldSize.Medium}
          onChange={function setPort(routerPort) {
            onChange({ routerPort: routerPort ?? 0 });
          }}
        />
      </div>
    </ModalDialog>
  );
}
