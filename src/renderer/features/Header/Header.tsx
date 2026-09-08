import { type ReactNode } from "react";

import styles from "@/renderer/features/Header/Header.module.scss";
import { useWindowControls } from "@/renderer/hooks/useWindowControls";
import DropdownSelect from "@/renderer/ui/DropdownSelect";
import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
import TextLabel from "@/renderer/ui/TextLabel";
import WindowControls from "@/renderer/ui/WindowControls";

type HeaderProps = {
  graphName: string;
  variant: string;
  variants: string[];
  onVariantChange: (variant: string) => void;
  onOpenSettings: () => void;
  children: ReactNode;
};

/** The window's own title bar. */
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
        <span className={styles.header__graph}>
          <IconButton
            label="Settings"
            tooltip="Settings"
            onClick={onOpenSettings}
          >
            <IconGlyph name={IconName.Settings} />
          </IconButton>
          <TextLabel>{graphName}</TextLabel>
          <DropdownSelect
            value={variant}
            label="Variant"
            options={variants}
            onChange={onVariantChange}
          />
          {children}
        </span>
        <span className={styles.header__actions}>
          <WindowControls
            maximized={controls.maximized}
            onMinimize={controls.minimize}
            onToggleMaximize={controls.toggleMaximize}
            onClose={controls.close}
          />
        </span>
      </header>
      <div className={styles.header__spacer} />
    </>
  );
}
