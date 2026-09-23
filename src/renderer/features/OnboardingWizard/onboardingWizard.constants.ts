import { AppTab } from "@/renderer/App.types";
import {
  type ExternalLink,
  type PrerequisiteInstructions,
  type TabWelcome,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.types";
import { Prerequisite } from "@/shared/onboarding/onboarding.types";

const CHECK_AGAIN_STEP = 'Press "Check again".';
const OPEN_GUIDE_STEP = "Open the install guide.";
const FOLLOW_GUIDE_STEP = "Follow the steps for your computer.";
const INSTALL_STEPS = [OPEN_GUIDE_STEP, FOLLOW_GUIDE_STEP, CHECK_AGAIN_STEP];

/** The prerequisites checked before the credentials step, since it needs them. */
export const PREREQUISITES_BEFORE_CREDENTIALS: Prerequisite[] = [
  Prerequisite.Rover,
];

/** The prerequisites checked after the credentials step, in step order. */
export const PREREQUISITES_AFTER_CREDENTIALS: Prerequisite[] = [
  Prerequisite.AwsCli,
  Prerequisite.SessionManagerPlugin,
  Prerequisite.DatabasesConfig,
];

/** The prerequisites whose absence the tabs have already read by the time the wizard closes. */
export const PREREQUISITES_THE_TABS_READ: Prerequisite[] = [
  Prerequisite.Rover,
  Prerequisite.DatabasesConfig,
];

export const PREREQUISITE_INSTRUCTIONS: Record<
  Prerequisite,
  PrerequisiteInstructions
> = {
  [Prerequisite.Rover]: {
    label: "Rover",
    title: "Install rover",
    purpose:
      "Rover is Apollo's command line tool. The app uses it to read your graph. It also runs the router.",
    steps: INSTALL_STEPS,
    command: null,
    link: {
      label: "Open the rover install guide",
      url: "https://www.apollographql.com/docs/rover/getting-started",
    },
    restartHint: true,
  },
  [Prerequisite.AwsCli]: {
    label: "AWS CLI",
    title: "Install the AWS CLI",
    purpose:
      "The Databases tab uses the AWS CLI. It signs you in to AWS. It also reads connection details.",
    steps: INSTALL_STEPS,
    command: null,
    link: {
      label: "Open the AWS CLI install guide",
      url: "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
    },
    restartHint: true,
  },
  [Prerequisite.SessionManagerPlugin]: {
    label: "Session Manager plugin",
    title: "Install the Session Manager plugin",
    purpose:
      "The AWS CLI needs this plugin. It connects a database to your machine.",
    steps: INSTALL_STEPS,
    command: null,
    link: {
      label: "Open the plugin install guide",
      url: "https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html",
    },
    restartHint: true,
  },
  [Prerequisite.DatabasesConfig]: {
    label: "databases.json",
    title: "Create databases.json",
    purpose:
      "The Databases tab lists the databases in this file. The file stays on your machine. It is not committed.",
    steps: [
      "Open a terminal in the repo folder.",
      "Run the command below.",
      "Replace the example entry with your databases.",
      CHECK_AGAIN_STEP,
    ],
    command: "cp databases.json.template databases.json",
    link: null,
    restartHint: false,
  },
};

export const RESTART_HINT =
  "Still not found after you installed it? Restart the app.";

export const CONTINUE_LABEL = "Continue";

export const DONE_LABEL = "Done";

export const GRAPH_REF_PROBLEM = "Use name@variant";

export const CREDENTIALS_LABEL = "Apollo credentials";

export const CREDENTIALS_TITLE = "Connect to Apollo";

export const CREDENTIALS_PURPOSE = "The app reads your subgraphs from Apollo.";

export const API_KEY_HELP =
  'Use a personal key from Apollo Studio. It starts with "user:".';

export const GRAPH_REF_HELP = "Enter the graph and variant as name@variant.";

export const STUDIO_LINK: ExternalLink = {
  label: "Create a key in Apollo Studio",
  url: "https://studio.apollographql.com",
};

export const WELCOME_TITLE_PREFIX = "How to use";

export const TAB_WELCOMES: Record<AppTab, TabWelcome> = {
  [AppTab.Supergraph]: {
    points: [
      "Pick a variant in the toolbar.",
      "Start your service on your machine.",
      "Find its subgraph in the list.",
      "Switch on Local for that subgraph.",
      "Enter the port your service listens on.",
      "Press the play button in the toolbar.",
      "Send your requests to the router.",
    ],
  },
  [AppTab.Databases]: {
    points: [
      "Pick an environment from the dropdown.",
      "Press the play button on a database row.",
      "Wait for the database to connect.",
      "Click the row to see its details.",
      "Copy the password.",
      "Connect your database client to localhost.",
      "Use the port shown in the row.",
    ],
  },
};
