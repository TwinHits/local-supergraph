import { Collapse } from "@mui/material";
import { type ReactNode, useState } from "react";

import ActionButton from "@/renderer/ui/ActionButton";

type CollapsiblePanelProps = {
  label: string;
  children: ReactNode;
};

/** A section that stays shut until its label is clicked. */
export default function CollapsiblePanel({
  label,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Collapse in={open}>{children}</Collapse>
      <ActionButton
        onClick={function toggle() {
          setOpen(!open);
        }}
      >
        {label}
      </ActionButton>
    </div>
  );
}
