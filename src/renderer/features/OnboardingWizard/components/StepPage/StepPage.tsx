import { type ReactNode, useEffect } from "react";

import styles from "@/renderer/features/OnboardingWizard/components/StepPage/StepPage.module.scss";
import ActionButton, { ButtonSize } from "@/renderer/ui/ActionButton";
import IconGlyph, { type IconName, IconSize } from "@/renderer/ui/IconGlyph";
import TextLabel from "@/renderer/ui/TextLabel";

const ENTER_KEY = "Enter";
const KEY_DOWN_EVENT = "keydown";

type StepPageProps = {
  title: string;
  icon?: IconName;
  purpose?: string;
  position: string;
  actionLabel: string;
  actionDisabled: boolean;
  onAction: () => void;
  children: ReactNode;
};

/** One wizard step's heading, scrolling body, and footer with the button that leaves it. */
export default function StepPage({
  title,
  icon,
  purpose,
  position,
  actionLabel,
  actionDisabled,
  onAction,
  children,
}: StepPageProps) {
  useEffect(
    function pressActionOnEnter() {
      if (actionDisabled) {
        return undefined;
      }
      const press = function pressIfEnter(event: KeyboardEvent): void {
        if (
          event.key !== ENTER_KEY ||
          event.target instanceof HTMLButtonElement
        ) {
          return;
        }
        onAction();
      };
      window.addEventListener(KEY_DOWN_EVENT, press);
      return function stopPressing() {
        window.removeEventListener(KEY_DOWN_EVENT, press);
      };
    },
    [actionDisabled, onAction]
  );

  return (
    <div className={styles.stepPage}>
      <div className={styles.stepPage__body}>
        <h2 className={styles.stepPage__title}>
          {icon === undefined ? null : (
            <IconGlyph name={icon} size={IconSize.Jumbo} />
          )}
          {title}
        </h2>
        {purpose === undefined ? null : (
          <TextLabel muted className={styles.stepPage__purpose}>
            {purpose}
          </TextLabel>
        )}
        {children}
      </div>
      <div className={styles.stepPage__footer}>
        <TextLabel muted>{position}</TextLabel>
        <ActionButton
          size={ButtonSize.Medium}
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </ActionButton>
      </div>
    </div>
  );
}
