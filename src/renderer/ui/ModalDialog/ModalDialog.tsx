import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { type ReactNode } from "react";

import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import styles from "@/renderer/ui/ModalDialog/ModalDialog.module.scss";
import { ModalSeverity } from "@/renderer/ui/ModalDialog/ModalDialog.types";

const PAPER_CLASSES: Record<ModalSeverity, string> = {
  [ModalSeverity.Error]: styles["modalDialog__paper--error"],
};

const TITLE_CLASSES: Record<ModalSeverity, string> = {
  [ModalSeverity.Error]: styles["modalDialog__title--error"],
};

type ModalDialogProps = {
  open: boolean;
  title: string;
  severity?: ModalSeverity;
  children: ReactNode;
  onClose: () => void;
};

/** A dialog. */
export default function ModalDialog({
  open,
  title,
  severity,
  children,
  onClose,
}: ModalDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          className:
            severity === undefined ? undefined : PAPER_CLASSES[severity],
        },
      }}
    >
      <DialogTitle
        className={[
          styles.modalDialog__title,
          severity === undefined ? "" : TITLE_CLASSES[severity],
        ]
          .join(" ")
          .trim()}
      >
        {title}
        <IconButton
          label="Close"
          tooltip="Close"
          variant={IconButtonVariant.Inline}
          stretch={false}
          onClick={onClose}
        >
          <IconGlyph name={IconName.Close} size={IconSize.Large} />
        </IconButton>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
