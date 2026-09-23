import { type AppTab } from "@/renderer/App.types";
import { type Prerequisite } from "@/shared/onboarding/onboarding.types";

/** Whether the app is still deciding, showing the wizard, or past it. */
export enum OnboardingState {
  Checking = "checking",
  Required = "required",
  Done = "done",
}

/** What kind of screen a step is. */
export enum StepKind {
  Prerequisite = "prerequisite",
  Credentials = "credentials",
  Welcome = "welcome",
}

/** One screen of the wizard, with whatever it is about. */
export type WizardStep =
  | { kind: StepKind.Prerequisite; prerequisite: Prerequisite }
  | { kind: StepKind.Credentials }
  | { kind: StepKind.Welcome; tab: AppTab };

/** Where a prerequisite's check stands. */
export enum CheckState {
  Checking = "checking",
  Found = "found",
  Missing = "missing",
}

/** A page to open for help with a step. */
export type ExternalLink = {
  label: string;
  url: string;
};

/** Everything a prerequisite step says. */
export type PrerequisiteInstructions = {
  label: string;
  title: string;
  purpose: string;
  steps: string[];
  command: string | null;
  link: ExternalLink | null;
  restartHint: boolean;
};

/** What a tab's welcome step says. */
export type TabWelcome = {
  points: string[];
};
