import { useEffect, useState } from "react";

import styles from "@/renderer/ui/CopyButton/CopyButton.module.scss";
import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import LoadingSpinner from "@/renderer/ui/LoadingSpinner";

const SUCCESS_DISPLAY_MS = 1000;

enum CopyButtonState {
  Idle = "idle",
  Loading = "loading",
  Success = "success",
}

type CopyButtonProps = {
  icon: IconName;
  label: string;
  tooltip: string;
  tooltipDelayMs?: number;
  onCopy: () => Promise<boolean>;
};

/** A copy action that spins while pending, then shows a checkmark for a second on success. */
export default function CopyButton({
  icon,
  label,
  tooltip,
  tooltipDelayMs,
  onCopy,
}: CopyButtonProps) {
  const [state, setState] = useState(CopyButtonState.Idle);

  useEffect(
    function revertAfterSuccess() {
      if (state !== CopyButtonState.Success) {
        return undefined;
      }
      const timeout = setTimeout(function revert() {
        setState(CopyButtonState.Idle);
      }, SUCCESS_DISPLAY_MS);
      return function cancel() {
        clearTimeout(timeout);
      };
    },
    [state]
  );

  function click(): void {
    setState(CopyButtonState.Loading);
    void onCopy()
      .then(function apply(succeeded) {
        setState(succeeded ? CopyButtonState.Success : CopyButtonState.Idle);
      })
      .catch(function revertOnError() {
        setState(CopyButtonState.Idle);
      });
  }

  return (
    <IconButton
      label={label}
      tooltip={tooltip}
      tooltipDelayMs={tooltipDelayMs}
      disabled={state === CopyButtonState.Loading}
      stretch={false}
      onClick={click}
    >
      {state === CopyButtonState.Loading && <LoadingSpinner label={label} />}
      {state === CopyButtonState.Success && (
        <span className={styles.copyButton__success}>
          <IconGlyph name={IconName.Success} size={IconSize.Large} />
        </span>
      )}
      {state === CopyButtonState.Idle && (
        <IconGlyph name={icon} size={IconSize.Large} />
      )}
    </IconButton>
  );
}
