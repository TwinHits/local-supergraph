import { Modal } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/OverlayPanel/OverlayPanel.module.scss";

type OverlayPanelProps = {
  open: boolean;
  label: string;
  children: ReactNode;
};

/** A panel over everything below the title bar that only its own content can close. */
export default function OverlayPanel({
  open,
  label,
  children,
}: OverlayPanelProps) {
  return (
    <Modal
      open={open}
      aria-label={label}
      className={styles.overlayPanel}
      slotProps={{ backdrop: { className: styles.overlayPanel__backdrop } }}
    >
      <div className={styles.overlayPanel__panel} tabIndex={-1}>
        {children}
      </div>
    </Modal>
  );
}
