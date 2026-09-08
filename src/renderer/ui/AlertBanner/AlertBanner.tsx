import { Alert as MuiAlert, ButtonBase } from "@mui/material";
import { type ReactNode } from "react";

import styles from "@/renderer/ui/AlertBanner/AlertBanner.module.scss";

type AlertBannerProps = {
  message: string;
  actions?: ReactNode;
  onClick?: () => void;
};

/** A banner that says something went wrong. */
export default function AlertBanner({
  message,
  actions,
  onClick,
}: AlertBannerProps) {
  return (
    <MuiAlert
      severity="error"
      variant="filled"
      icon={false}
      action={actions}
      className={styles.alertBanner}
    >
      {onClick === undefined ? (
        <span className={styles.alertBanner__message}>{message}</span>
      ) : (
        <ButtonBase className={styles.alertBanner__message} onClick={onClick}>
          {message}
        </ButtonBase>
      )}
    </MuiAlert>
  );
}
