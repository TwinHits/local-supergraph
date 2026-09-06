import { type ReactNode } from "react";

import styles from "@/renderer/features/Header/Header.module.scss";
import { useWindowControls } from "@/renderer/hooks/useWindowControls";
import Icon, { IconName } from "@/renderer/ui/Icon";
import IconButton from "@/renderer/ui/IconButton";
import Select from "@/renderer/ui/Select";
import Text from "@/renderer/ui/Text";
import WindowControls from "@/renderer/ui/WindowControls";

type HeaderProps = {
  graphName: string;
  variant: string;
  variants: string[];
  onVariantChange: (variant: string) => void;
  onOpenSettings: () => void;
  children: ReactNode;
};

/** The window's title bar: graph, variant, launch, and settings. */
export default function Header({
  graphName,
  variant,
  variants,
  onVariantChange,
  onOpenSettings,
  children,
}: HeaderProps) {
  const controls = useWindowControls();

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
          <IconButton label="Settings" onClick={onOpenSettings}>
            <Icon name={IconName.Settings} />
          </IconButton>
          <WindowControls
            maximized={controls.maximized}
            onMinimize={controls.minimize}
            onToggleMaximize={controls.toggleMaximize}
            onClose={controls.close}
          />
        </span>
      </header>
      <div className={styles.spacer} />
    </>
  );
}
