import { api } from "@/renderer/api";
import ErrorModal from "@/renderer/features/ErrorModal";
import { useErrorModal } from "@/renderer/features/ErrorModal/useErrorModal";
import styles from "@/renderer/features/OnboardingWizard/components/CredentialsStep/CredentialsStep.module.scss";
import StepPage from "@/renderer/features/OnboardingWizard/components/StepPage";
import {
  API_KEY_HELP,
  CREDENTIALS_PURPOSE,
  CREDENTIALS_TITLE,
  GRAPH_REF_HELP,
  STUDIO_LINK,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.constants";
import {
  canSubmitCredentials,
  findGraphRefProblem,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.utils";
import { useCredentialsStep } from "@/renderer/features/OnboardingWizard/useCredentialsStep";
import ActionButton, { ButtonVariant } from "@/renderer/ui/ActionButton";
import ErrorBanner from "@/renderer/ui/ErrorBanner";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import TextField, { TextFieldSize } from "@/renderer/ui/TextField";
import TextLabel from "@/renderer/ui/TextLabel";

const ERROR_SUBJECT = "Apollo credentials";
const CHECKING_LABEL = "Checking";

type CredentialsStepProps = {
  position: string;
  actionLabel: string;
  onContinue: () => void;
};

/** Collects the Apollo key and graph ref, continuing only once the registry accepts them. */
export default function CredentialsStep({
  position,
  actionLabel,
  onContinue,
}: CredentialsStepProps) {
  const step = useCredentialsStep(onContinue);
  const modal = useErrorModal();
  const { credentials, submitting } = step;

  return (
    <StepPage
      title={CREDENTIALS_TITLE}
      purpose={CREDENTIALS_PURPOSE}
      position={position}
      actionLabel={submitting ? CHECKING_LABEL : actionLabel}
      actionDisabled={submitting || !canSubmitCredentials(credentials)}
      onAction={step.submit}
    >
      <ErrorBanner
        diagnoses={step.diagnoses}
        onClick={function showErrors() {
          modal.show(ERROR_SUBJECT, step.diagnoses);
        }}
      />
      <div className={styles.credentialsStep__field}>
        <TextField
          value={credentials.apolloKey}
          label="Apollo API key"
          size={TextFieldSize.Medium}
          masked
          disabled={submitting}
          onChange={step.changeKey}
        />
        <TextLabel muted>{API_KEY_HELP}</TextLabel>
        <ActionButton
          variant={ButtonVariant.Secondary}
          startIcon={
            <IconGlyph name={IconName.OpenLink} size={IconSize.Small} />
          }
          onClick={function openStudio() {
            void api.windowControls.openExternal(STUDIO_LINK.url);
          }}
        >
          {STUDIO_LINK.label}
        </ActionButton>
      </div>
      <div className={styles.credentialsStep__field}>
        <TextField
          value={credentials.graphRef}
          label="Graph ref"
          placeholder="my-graph@current"
          size={TextFieldSize.Medium}
          disabled={submitting}
          error={findGraphRefProblem(credentials.graphRef) ?? undefined}
          onChange={step.changeGraphRef}
        />
        <TextLabel muted>{GRAPH_REF_HELP}</TextLabel>
      </div>
      <ErrorModal
        key={modal.shown.subject}
        open={modal.open}
        subject={modal.shown.subject}
        diagnoses={modal.shown.diagnoses}
        onClose={modal.close}
      />
    </StepPage>
  );
}
