import { Fade as MuiFade } from "@mui/material";
import { type ReactElement } from "react";

type FadeProps = {
  children: ReactElement;
};

/** Fades its child in whenever it mounts. */
export default function Fade({ children }: FadeProps) {
  return (
    <MuiFade in appear>
      {children}
    </MuiFade>
  );
}
