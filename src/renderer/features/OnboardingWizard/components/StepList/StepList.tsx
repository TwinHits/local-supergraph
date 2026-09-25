import styles from "@/renderer/features/OnboardingWizard/components/StepList/StepList.module.scss";
import { type WizardStep } from "@/renderer/features/OnboardingWizard/onboardingWizard.types";
import { describeStep } from "@/renderer/features/OnboardingWizard/onboardingWizard.utils";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";

type StepListProps = {
  steps: WizardStep[];
  currentIndex: number;
};

/** Classes for one entry, by where it sits relative to the current step. */
function itemClasses(index: number, currentIndex: number): string {
  if (index < currentIndex) {
    return [styles.stepList__item, styles["stepList__item--done"]].join(" ");
  }
  if (index === currentIndex) {
    return [styles.stepList__item, styles["stepList__item--current"]].join(" ");
  }
  return styles.stepList__item;
}

/** Every step of the wizard, marking the finished ones and the current one. */
export default function StepList({ steps, currentIndex }: StepListProps) {
  return (
    <ol className={styles.stepList}>
      {steps.map(function renderStep(step, index) {
        return (
          <li
            key={index}
            className={itemClasses(index, currentIndex)}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className={styles.stepList__marker}>
              {index < currentIndex ? (
                <IconGlyph name={IconName.Success} size={IconSize.Small} />
              ) : (
                index + 1
              )}
            </span>
            {describeStep(step)}
          </li>
        );
      })}
    </ol>
  );
}
