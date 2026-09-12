import styles from "@/renderer/features/Header/Header.module.scss";
import { useWindowControls } from "@/renderer/hooks/useWindowControls";
import WindowControls from "@/renderer/ui/WindowControls";

import logo from "../../../../assets/logo-mark.png";

/** The window's own title bar. */
export default function Header() {
  const controls = useWindowControls();

  return (
    <>
      <header className={styles.header}>
        <span className={styles.header__logo}>
          <img src={logo} alt="" className={styles.header__logoImage} />
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
