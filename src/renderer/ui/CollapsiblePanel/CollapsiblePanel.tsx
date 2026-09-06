import { Collapse } from "@mui/material";
import { type ReactNode, useState } from "react";

import ActionButton from "@/renderer/ui/ActionButton";

type CollapsiblePanelProps = {
  label: string;
  children: ReactNode;
};

/** A section that stays shut until asked for, like "More info". */
export default function CollapsiblePanel({
  label,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <ActionButton
        onClick={function toggle() {
          setOpen(!open);
        }}
      >
        {label}
      </ActionButton>
      <Collapse in={open}>{children}</Collapse>
    </div>
  );
}
