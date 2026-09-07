import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { type ReactNode } from "react";

type ModalDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

/** A dialog. */
export default function ModalDialog({
  open,
  title,
  children,
  onClose,
}: ModalDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
