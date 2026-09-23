import { api } from "@/renderer/api";
import styles from "@/renderer/features/OnboardingWizard/components/PrerequisiteStep/PrerequisiteStep.module.scss";
import StepPage from "@/renderer/features/OnboardingWizard/components/StepPage";
import {
  PREREQUISITE_INSTRUCTIONS,
  RESTART_HINT,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.constants";
import { CheckState } from "@/renderer/features/OnboardingWizard/onboardingWizard.types";
import ActionButton, { ButtonVariant } from "@/renderer/ui/ActionButton";
import CopyButton from "@/renderer/ui/CopyButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import StatusIndicator, { StatusTone } from "@/renderer/ui/StatusIndicator";
import TextLabel from "@/renderer/ui/TextLabel";
import { type Prerequisite } from "@/shared/onboarding/onboarding.types";

const CHECK_TONES: Record<CheckState, StatusTone> = {
  [CheckState.Checking]: StatusTone.Pending,
  [CheckState.Found]: StatusTone.Healthy,
  [CheckState.Missing]: StatusTone.Failed,
};

const CHECK_LABELS: Record<CheckState, string> = {
  [CheckState.Checking]: "Checking",
  [CheckState.Found]: "Found",
  [CheckState.Missing]: "Not found",
};

type PrerequisiteStepProps = {
  prerequisite: Prerequisite;
  checkState: CheckState;
  position: string;
  actionLabel: string;
  onRecheck: () => void;
  onContinue: () => void;
};

/** Explains how to set up one prerequisite and shows whether it is in place yet. */
export default function PrerequisiteStep({
  prerequisite,
  checkState,
  position,
  actionLabel,
  onRecheck,
  onContinue,
}: PrerequisiteStepProps) {
  const instructions = PREREQUISITE_INSTRUCTIONS[prerequisite];
  const { command, link } = instructions;

  return (
    <StepPage
      title={instructions.title}
      purpose={instructions.purpose}
      position={position}
      actionLabel={actionLabel}
      actionDisabled={checkState !== CheckState.Found}
      onAction={onContinue}
    >
      <ol className={styles.prerequisiteStep__steps}>
        {instructions.steps.map(function renderInstruction(instruction) {
          return <li key={instruction}>{instruction}</li>;
        })}
      </ol>
      {command === null ? null : (
        <div className={styles.prerequisiteStep__command}>
          <code className={styles.prerequisiteStep__commandText}>
            {command}
          </code>
          <CopyButton
            icon={IconName.Copy}
            label="Copy the command"
            tooltip="Copy"
            onCopy={async function copyCommand() {
              await api.clipboard.copyText(command);
              return true;
            }}
          />
        </div>
      )}
      {link === null ? null : (
        <ActionButton
          variant={ButtonVariant.Secondary}
          startIcon={
            <IconGlyph name={IconName.OpenLink} size={IconSize.Small} />
          }
          onClick={function openLink() {
            void api.windowControls.openExternal(link.url);
          }}
        >
          {link.label}
        </ActionButton>
      )}
      <div className={styles.prerequisiteStep__status}>
        <StatusIndicator
          tone={CHECK_TONES[checkState]}
          label={CHECK_LABELS[checkState]}
          reason={null}
        />
        <TextLabel>{CHECK_LABELS[checkState]}</TextLabel>
        <ActionButton
          variant={ButtonVariant.Secondary}
          disabled={checkState === CheckState.Checking}
          onClick={onRecheck}
        >
          Check again
        </ActionButton>
      </div>
      {checkState === CheckState.Missing && instructions.restartHint ? (
        <TextLabel muted>{RESTART_HINT}</TextLabel>
      ) : null}
    </StepPage>
  );
}
