import CredentialsStep from "@/renderer/features/OnboardingWizard/components/CredentialsStep";
import PrerequisiteStep from "@/renderer/features/OnboardingWizard/components/PrerequisiteStep";
import StepList from "@/renderer/features/OnboardingWizard/components/StepList";
import WelcomeStep from "@/renderer/features/OnboardingWizard/components/WelcomeStep";
import {
  OnboardingState,
  StepKind,
  type WizardStep,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.types";
import {
  chooseActionLabel,
  formatStepPosition,
  readCheckState,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.utils";
import { type useOnboardingWizard } from "@/renderer/features/OnboardingWizard/useOnboardingWizard";
import OverlayPanel from "@/renderer/ui/OverlayPanel";

const OVERLAY_LABEL = "Set up the app";

type Wizard = ReturnType<typeof useOnboardingWizard>;

type OnboardingWizardProps = {
  wizard: Wizard;
};

/** The screen for whichever step the wizard is on. */
function renderStep(step: WizardStep, wizard: Wizard) {
  const position = formatStepPosition(wizard.stepIndex, wizard.steps.length);
  const actionLabel = chooseActionLabel(wizard.stepIndex, wizard.steps.length);

  if (step.kind === StepKind.Prerequisite) {
    return (
      <PrerequisiteStep
        prerequisite={step.prerequisite}
        checkState={readCheckState(
          step.prerequisite,
          wizard.missing,
          wizard.checking
        )}
        position={position}
        actionLabel={actionLabel}
        onRecheck={wizard.recheck}
        onContinue={wizard.advance}
      />
    );
  }
  if (step.kind === StepKind.Credentials) {
    return (
      <CredentialsStep
        position={position}
        actionLabel={actionLabel}
        onContinue={wizard.advance}
      />
    );
  }
  return (
    <WelcomeStep
      tab={step.tab}
      position={position}
      actionLabel={actionLabel}
      onContinue={wizard.advance}
    />
  );
}

/** Walks a developer through setting the app up, over the app itself. */
export default function OnboardingWizard({ wizard }: OnboardingWizardProps) {
  const step = wizard.steps[wizard.stepIndex];

  return (
    <OverlayPanel
      open={wizard.state === OnboardingState.Required && step !== undefined}
      label={OVERLAY_LABEL}
    >
      <StepList steps={wizard.steps} currentIndex={wizard.stepIndex} />
      {step === undefined ? null : renderStep(step, wizard)}
    </OverlayPanel>
  );
}
