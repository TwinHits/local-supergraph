import { TAB_DETAILS } from "@/renderer/App.constants";
import { type AppTab } from "@/renderer/App.types";
import StepPage from "@/renderer/features/OnboardingWizard/components/StepPage";
import styles from "@/renderer/features/OnboardingWizard/components/WelcomeStep/WelcomeStep.module.scss";
import { TAB_WELCOMES } from "@/renderer/features/OnboardingWizard/onboardingWizard.constants";
import { formatWelcomeTitle } from "@/renderer/features/OnboardingWizard/onboardingWizard.utils";

type WelcomeStepProps = {
  tab: AppTab;
  position: string;
  actionLabel: string;
  onContinue: () => void;
};

/** Introduces one tab of the app. */
export default function WelcomeStep({
  tab,
  position,
  actionLabel,
  onContinue,
}: WelcomeStepProps) {
  const details = TAB_DETAILS[tab];

  return (
    <StepPage
      title={formatWelcomeTitle(tab)}
      icon={details.icon}
      position={position}
      actionLabel={actionLabel}
      actionDisabled={false}
      onAction={onContinue}
    >
      <ol className={styles.welcomeStep__points}>
        {TAB_WELCOMES[tab].points.map(function renderPoint(point) {
          return <li key={point}>{point}</li>;
        })}
      </ol>
    </StepPage>
  );
}
