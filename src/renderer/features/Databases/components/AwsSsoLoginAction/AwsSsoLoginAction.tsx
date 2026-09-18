import { useState } from "react";

import ActionButton from "@/renderer/ui/ActionButton";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

type AwsSsoLoginActionProps = {
  diagnosis: Diagnosis;
  onLogin: (diagnosis: Diagnosis) => Promise<boolean>;
};

/** Offers to sign back in through AWS SSO for a stale-credentials diagnosis; renders nothing for any other kind. */
export default function AwsSsoLoginAction({
  diagnosis,
  onLogin,
}: AwsSsoLoginActionProps) {
  const [loggingIn, setLoggingIn] = useState(false);

  if (diagnosis.key !== ErrorKey.AwsSsoExpired) {
    return null;
  }

  function login(): void {
    setLoggingIn(true);
    void onLogin(diagnosis)
      .then(function done() {
        setLoggingIn(false);
      })
      .catch(function revertOnError() {
        setLoggingIn(false);
      });
  }

  return (
    <ActionButton onClick={login} disabled={loggingIn}>
      {loggingIn ? "Signing in…" : "Login"}
    </ActionButton>
  );
}
