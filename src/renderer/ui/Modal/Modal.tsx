import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

/** Every dialog in the app: one width, one way to close. */
export default function Modal({ open, title, children, onClose }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
