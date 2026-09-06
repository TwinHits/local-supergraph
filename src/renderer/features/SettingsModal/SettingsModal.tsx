import styles from "@/renderer/features/SettingsModal/SettingsModal.module.scss";
import Modal from "@/renderer/ui/Modal";
import NumberField from "@/renderer/ui/NumberField";
import Select from "@/renderer/ui/Select";
import { type Settings } from "@/shared/settings/settings.types";
import { ThemeName } from "@/shared/themes/themes.types";

type SettingsModalProps = {
  open: boolean;
  settings: Settings;
  theme: ThemeName;
  onChange: (patch: Partial<Settings>) => void;
  onThemeChange: (name: ThemeName) => void;
  onClose: () => void;
};

const THEME_NAMES: string[] = [ThemeName.Light, ThemeName.Dark];

/** Every defaulted setting. Nothing here is asked for during setup. */
export default function SettingsModal({
  open,
  settings,
  theme,
  onChange,
  onThemeChange,
  onClose,
}: SettingsModalProps) {
  return (
    <Modal open={open} title="Settings" onClose={onClose}>
      <div className={styles.settingsModal__fields}>
        <Select
          value={theme}
          label="Theme"
          options={THEME_NAMES}
          onChange={function setTheme(next) {
            onThemeChange(next as ThemeName);
          }}
        />
        <NumberField
          value={settings.routerPort}
          label="Router port"
          onChange={function setPort(routerPort) {
            onChange({ routerPort: routerPort ?? 0 });
          }}
        />
        <NumberField
          value={settings.healthCheckIntervalMs}
          label="Health check interval (ms)"
          onChange={function setInterval(healthCheckIntervalMs) {
            onChange({ healthCheckIntervalMs: healthCheckIntervalMs ?? 0 });
          }}
        />
      </div>
    </Modal>
  );
}
