import styles from "@/renderer/features/SettingsModal/SettingsModal.module.scss";
import ModalDialog from "@/renderer/ui/ModalDialog";
import MultiSelect from "@/renderer/ui/MultiSelect";
import NumberField from "@/renderer/ui/NumberField";
import { TextFieldSize } from "@/renderer/ui/TextField";
import { type Settings } from "@/shared/settings/settings.types";

type SettingsModalProps = {
  open: boolean;
  settings: Settings;
  variantFilter: string[];
  allVariants: string[];
  onChange: (patch: Partial<Settings>) => void;
  onVariantFilterChange: (names: string[]) => void;
  onClose: () => void;
};

/** The dialog for settings that already have a default. */
export default function SettingsModal({
  open,
  settings,
  variantFilter,
  allVariants,
  onChange,
  onVariantFilterChange,
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
        <MultiSelect
          label="Variants"
          value={variantFilter}
          options={allVariants}
          onChange={onVariantFilterChange}
        />
      </div>
    </ModalDialog>
  );
}
