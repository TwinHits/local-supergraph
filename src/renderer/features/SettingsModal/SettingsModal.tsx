import styles from "@/renderer/features/SettingsModal/SettingsModal.module.scss";
import ModalDialog from "@/renderer/ui/ModalDialog";
import NumberField from "@/renderer/ui/NumberField";
import { type Settings } from "@/shared/settings/settings.types";

type SettingsModalProps = {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
};

/** Every defaulted setting. Nothing here is asked for during setup. */
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
          onChange={function setPort(routerPort) {
            onChange({ routerPort: routerPort ?? 0 });
          }}
        />
      </div>
    </ModalDialog>
  );
}
