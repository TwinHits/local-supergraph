import { Collapse } from "@mui/material";
import { type ReactNode, useState } from "react";

import Button from "@/renderer/ui/Button";

type CollapsibleProps = {
  label: string;
  children: ReactNode;
};

/** A section that stays shut until asked for, like "More info". */
export default function Collapsible({ label, children }: CollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        onClick={function toggle() {
          setOpen(!open);
        }}
      >
        {label}
      </Button>
      <Collapse in={open}>{children}</Collapse>
    </div>
  );
}
