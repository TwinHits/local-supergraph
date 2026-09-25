import { TAB_DETAILS } from "@/renderer/App.constants";
import { AppTab } from "@/renderer/App.types";
import {
  CONTINUE_LABEL,
  CREDENTIALS_LABEL,
  DONE_LABEL,
  GRAPH_REF_PROBLEM,
  PREREQUISITE_INSTRUCTIONS,
  PREREQUISITES_AFTER_CREDENTIALS,
  PREREQUISITES_BEFORE_CREDENTIALS,
  PREREQUISITES_THE_TABS_READ,
  WELCOME_TITLE_PREFIX,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.constants";
import {
  CheckState,
  StepKind,
  type WizardStep,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.types";
import { GRAPH_REF_SEPARATOR } from "@/shared/onboarding/onboarding.constants";
import {
  type ApolloCredentials,
  type OnboardingStatus,
  type Prerequisite,
} from "@/shared/onboarding/onboarding.types";

const WHITESPACE = /\s/;

/** Whether the wizard needs to show for this status. */
export function isOnboardingRequired(status: OnboardingStatus): boolean {
  return !status.completed || !status.configured || status.missing.length > 0;
}

/** Whether finishing the wizard changes something the tabs read while it was open. */
export function changesWhatTabsRead(status: OnboardingStatus): boolean {
  return (
    !status.configured ||
    PREREQUISITES_THE_TABS_READ.some(function isMissing(prerequisite) {
      return status.missing.includes(prerequisite);
    })
  );
}

/** The steps for whichever of these prerequisites are missing, in order. */
function buildPrerequisiteSteps(
  prerequisites: Prerequisite[],
  missing: Prerequisite[]
): WizardStep[] {
  return prerequisites
    .filter(function isMissing(prerequisite) {
      return missing.includes(prerequisite);
    })
    .map(function toStep(prerequisite): WizardStep {
      return { kind: StepKind.Prerequisite, prerequisite };
    });
}

/** The steps the wizard walks through for this status, in order. */
export function buildSteps(status: OnboardingStatus): WizardStep[] {
  const credentialsSteps: WizardStep[] = status.configured
    ? []
    : [{ kind: StepKind.Credentials }];
  const welcomeSteps: WizardStep[] = status.completed
    ? []
    : Object.values(AppTab).map(function toStep(tab): WizardStep {
        return { kind: StepKind.Welcome, tab };
      });
  return [
    ...buildPrerequisiteSteps(PREREQUISITES_BEFORE_CREDENTIALS, status.missing),
    ...credentialsSteps,
    ...buildPrerequisiteSteps(PREREQUISITES_AFTER_CREDENTIALS, status.missing),
    ...welcomeSteps,
  ];
}

/** The short name a step goes by in the step list. */
export function describeStep(step: WizardStep): string {
  if (step.kind === StepKind.Prerequisite) {
    return PREREQUISITE_INSTRUCTIONS[step.prerequisite].label;
  }
  if (step.kind === StepKind.Credentials) {
    return CREDENTIALS_LABEL;
  }
  return TAB_DETAILS[step.tab].label;
}

/** The heading of a tab's welcome step. */
export function formatWelcomeTitle(tab: AppTab): string {
  return `${WELCOME_TITLE_PREFIX} ${TAB_DETAILS[tab].label}`;
}

/** Where a step sits in the wizard, as the footer shows it. */
export function formatStepPosition(index: number, count: number): string {
  return `Step ${index + 1} of ${count}`;
}

/** What the button that leaves a step says. */
export function chooseActionLabel(index: number, count: number): string {
  return index === count - 1 ? DONE_LABEL : CONTINUE_LABEL;
}

/** Where a prerequisite's check stands, given the latest status. */
export function readCheckState(
  prerequisite: Prerequisite,
  missing: Prerequisite[],
  checking: boolean
): CheckState {
  if (checking) {
    return CheckState.Checking;
  }
  return missing.includes(prerequisite) ? CheckState.Missing : CheckState.Found;
}

/** Whether a value is shaped like name@variant. */
export function isValidGraphRef(value: string): boolean {
  if (WHITESPACE.test(value)) {
    return false;
  }
  const parts = value.split(GRAPH_REF_SEPARATOR);
  return parts.length === 2 && parts[0] !== "" && parts[1] !== "";
}

/** What is wrong with a graph ref as typed, or null when it is empty or valid. */
export function findGraphRefProblem(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || isValidGraphRef(trimmed)) {
    return null;
  }
  return GRAPH_REF_PROBLEM;
}

/** The credentials with the whitespace a paste tends to carry removed. */
export function trimCredentials(
  credentials: ApolloCredentials
): ApolloCredentials {
  return {
    apolloKey: credentials.apolloKey.trim(),
    graphRef: credentials.graphRef.trim(),
  };
}

/** Whether the credentials are complete enough to check against the registry. */
export function canSubmitCredentials(credentials: ApolloCredentials): boolean {
  const trimmed = trimCredentials(credentials);
  return (
    trimmed.apolloKey !== "" &&
    !WHITESPACE.test(trimmed.apolloKey) &&
    isValidGraphRef(trimmed.graphRef)
  );
}
