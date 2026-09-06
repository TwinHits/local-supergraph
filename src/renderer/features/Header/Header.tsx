import { type ReactNode } from "react";
import Icon, { IconName } from "@/renderer/ui/Icon";
import IconAction from "@/renderer/ui/IconAction";
import Select from "@/renderer/ui/Select";
import Text from "@/renderer/ui/Text";
import styles from "@/renderer/features/Header/Header.module.scss";

type HeaderProps = {
  graphName: string;
  variant: string;
  variants: string[];
  onVariantChange: (variant: string) => void;
  onOpenSettings: () => void;
  children: ReactNode;
};

/** The window's title bar: graph ref, variant, launch, and settings. */
export default function Header({
  graphName,
  variant,
  variants,
  onVariantChange,
  onOpenSettings,
  children,
}: HeaderProps) {
  return (
    <>
      <header className={styles.header}>
        <span className={styles.graph}>
          <Text>{graphName}</Text>
          <Select
            value={variant}
            label="Variant"
            options={variants}
            onChange={onVariantChange}
          />
        </span>
        <span className={styles.actions}>
          {children}
          <IconAction label="Settings" large onClick={onOpenSettings}>
            <Icon name={IconName.Settings} />
          </IconAction>
        </span>
      </header>
      <div className={styles.spacer} />
    </>
  );
}
