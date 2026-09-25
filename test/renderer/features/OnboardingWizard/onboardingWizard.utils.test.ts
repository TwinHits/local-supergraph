import { describe, expect, it } from "vitest";

import { AppTab } from "@/renderer/App.types";
import {
  CheckState,
  StepKind,
  type WizardStep,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.types";
import {
  buildSteps,
  canSubmitCredentials,
  changesWhatTabsRead,
  chooseActionLabel,
  describeStep,
  findGraphRefProblem,
  formatStepPosition,
  formatWelcomeTitle,
  isOnboardingRequired,
  isValidGraphRef,
  readCheckState,
  trimCredentials,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.utils";
import { Prerequisite } from "@/shared/onboarding/onboarding.types";

const FINISHED = { completed: true, configured: true, missing: [] };

describe("the wizard shows when it has never been completed on the app's current version", () => {
  it("is required when it has not been completed", () => {
    const actual = isOnboardingRequired({ ...FINISHED, completed: false });

    expect(actual).toBe(true);
  });
});

describe("the wizard shows when the Apollo credentials or any prerequisite is missing, even after it has been completed", () => {
  it("is required when the credentials are missing", () => {
    const actual = isOnboardingRequired({ ...FINISHED, configured: false });

    expect(actual).toBe(true);
  });

  it("is required when a prerequisite is missing", () => {
    const actual = isOnboardingRequired({
      ...FINISHED,
      missing: [Prerequisite.SessionManagerPlugin],
    });

    expect(actual).toBe(true);
  });
});

describe("the wizard does not show when it has been completed and nothing is missing", () => {
  it("is not required", () => {
    const actual = isOnboardingRequired(FINISHED);

    expect(actual).toBe(false);
  });
});

describe("each missing prerequisite, and missing credentials, get their own step, in a fixed order", () => {
  it("puts rover first, then credentials, then the Databases prerequisites", () => {
    const expected: WizardStep[] = [
      { kind: StepKind.Prerequisite, prerequisite: Prerequisite.Rover },
      { kind: StepKind.Credentials },
      { kind: StepKind.Prerequisite, prerequisite: Prerequisite.AwsCli },
      {
        kind: StepKind.Prerequisite,
        prerequisite: Prerequisite.SessionManagerPlugin,
      },
      {
        kind: StepKind.Prerequisite,
        prerequisite: Prerequisite.DatabasesConfig,
      },
    ];

    const actual = buildSteps({
      completed: true,
      configured: false,
      missing: [
        Prerequisite.DatabasesConfig,
        Prerequisite.SessionManagerPlugin,
        Prerequisite.AwsCli,
        Prerequisite.Rover,
      ],
    });

    expect(actual).toEqual(expected);
  });
});

describe("a step for something already in place is left out", () => {
  it("leaves out the credentials step when the credentials are set", () => {
    const actual = buildSteps({
      ...FINISHED,
      missing: [Prerequisite.AwsCli],
    });

    expect(actual).toEqual([
      { kind: StepKind.Prerequisite, prerequisite: Prerequisite.AwsCli },
    ]);
  });

  it("leaves out a prerequisite that was found", () => {
    const actual = buildSteps({ ...FINISHED, configured: false });

    expect(actual).toEqual([{ kind: StepKind.Credentials }]);
  });
});

describe("every tab has its own welcome step, and they show only when the wizard has never been completed", () => {
  it("adds one welcome per tab, in tab rail order, after the other steps", () => {
    const expected: WizardStep[] = [
      { kind: StepKind.Prerequisite, prerequisite: Prerequisite.AwsCli },
      { kind: StepKind.Welcome, tab: AppTab.Supergraph },
      { kind: StepKind.Welcome, tab: AppTab.Databases },
    ];

    const actual = buildSteps({
      completed: false,
      configured: true,
      missing: [Prerequisite.AwsCli],
    });

    expect(actual).toEqual(expected);
  });

  it("leaves the welcomes out once the wizard was finished", () => {
    const actual = buildSteps({ ...FINISHED, missing: [Prerequisite.Rover] });

    expect(actual).toEqual([
      { kind: StepKind.Prerequisite, prerequisite: Prerequisite.Rover },
    ]);
  });

  it("heads each welcome with how to use its tab", () => {
    const actual = [
      formatWelcomeTitle(AppTab.Supergraph),
      formatWelcomeTitle(AppTab.Databases),
    ];

    expect(actual).toEqual(["How to use Supergraph", "How to use Databases"]);
  });
});

describe("the step list names every step, and the footer says where the current step is", () => {
  it("names a prerequisite step after the prerequisite", () => {
    const actual = describeStep({
      kind: StepKind.Prerequisite,
      prerequisite: Prerequisite.SessionManagerPlugin,
    });

    expect(actual).toBe("Session Manager plugin");
  });

  it("names the credentials step", () => {
    const actual = describeStep({ kind: StepKind.Credentials });

    expect(actual).toBe("Apollo credentials");
  });

  it("names a welcome step after its tab", () => {
    const actual = describeStep({
      kind: StepKind.Welcome,
      tab: AppTab.Databases,
    });

    expect(actual).toBe("Databases");
  });

  it("counts steps from one", () => {
    const actual = formatStepPosition(0, 3);

    expect(actual).toBe("Step 1 of 3");
  });

  it("offers Continue on every step but the last", () => {
    const actual = chooseActionLabel(1, 3);

    expect(actual).toBe("Continue");
  });

  it("offers Done on the last step", () => {
    const actual = chooseActionLabel(2, 3);

    expect(actual).toBe("Done");
  });
});

describe("a step cannot be continued past until its check passes", () => {
  it("is checking while a check is running, whatever the last answer was", () => {
    const actual = readCheckState(Prerequisite.AwsCli, [], true);

    expect(actual).toBe(CheckState.Checking);
  });

  it("is missing while the last check did not find it", () => {
    const actual = readCheckState(
      Prerequisite.AwsCli,
      [Prerequisite.AwsCli],
      false
    );

    expect(actual).toBe(CheckState.Missing);
  });

  it("is found once the last check found it", () => {
    const actual = readCheckState(
      Prerequisite.AwsCli,
      [Prerequisite.Rover],
      false
    );

    expect(actual).toBe(CheckState.Found);
  });
});

describe("a graph ref is accepted only as name@variant, with neither part empty and no whitespace in it", () => {
  it("accepts name@variant", () => {
    expect(isValidGraphRef("my-graph@current")).toBe(true);
  });

  it("rejects a ref with no variant", () => {
    expect(isValidGraphRef("my-graph")).toBe(false);
  });

  it("rejects an empty graph name", () => {
    expect(isValidGraphRef("@current")).toBe(false);
  });

  it("rejects an empty variant", () => {
    expect(isValidGraphRef("my-graph@")).toBe(false);
  });

  it("rejects more than one @", () => {
    expect(isValidGraphRef("my@graph@current")).toBe(false);
  });

  it("rejects whitespace inside the ref", () => {
    expect(isValidGraphRef("my graph@current")).toBe(false);
  });

  it("says nothing about an empty ref, since nothing has been typed yet", () => {
    expect(findGraphRefProblem("")).toBeNull();
  });

  it("says nothing about a valid ref", () => {
    expect(findGraphRefProblem(" my-graph@current ")).toBeNull();
  });

  it("names the expected shape for an invalid ref", () => {
    expect(findGraphRefProblem("my-graph")).toBe("Use name@variant");
  });
});

describe("credentials can be submitted only once both values are complete", () => {
  it("can be submitted with a key and a valid graph ref", () => {
    const actual = canSubmitCredentials({
      apolloKey: "user:abc",
      graphRef: "my-graph@current",
    });

    expect(actual).toBe(true);
  });

  it("cannot be submitted without a key", () => {
    const actual = canSubmitCredentials({
      apolloKey: "   ",
      graphRef: "my-graph@current",
    });

    expect(actual).toBe(false);
  });

  it("cannot be submitted with whitespace inside the key", () => {
    const actual = canSubmitCredentials({
      apolloKey: "user:a\nbc",
      graphRef: "my-graph@current",
    });

    expect(actual).toBe(false);
  });

  it("cannot be submitted with an invalid graph ref", () => {
    const actual = canSubmitCredentials({
      apolloKey: "user:abc",
      graphRef: "my-graph",
    });

    expect(actual).toBe(false);
  });

  it("drops the whitespace a paste carries around each value", () => {
    const expected = { apolloKey: "user:abc", graphRef: "my-graph@current" };

    const actual = trimCredentials({
      apolloKey: " user:abc\n",
      graphRef: "\tmy-graph@current ",
    });

    expect(actual).toEqual(expected);
  });
});

describe("after the wizard closes, a tab reloads only when the wizard changed something it read", () => {
  it("reloads when the credentials were set up", () => {
    const actual = changesWhatTabsRead({ ...FINISHED, configured: false });

    expect(actual).toBe(true);
  });

  it("reloads when rover was installed", () => {
    const actual = changesWhatTabsRead({
      ...FINISHED,
      missing: [Prerequisite.Rover],
    });

    expect(actual).toBe(true);
  });

  it("reloads when databases.json was created", () => {
    const actual = changesWhatTabsRead({
      ...FINISHED,
      missing: [Prerequisite.DatabasesConfig],
    });

    expect(actual).toBe(true);
  });

  it("does not reload for tools only a connect attempt uses", () => {
    const actual = changesWhatTabsRead({
      ...FINISHED,
      missing: [Prerequisite.AwsCli, Prerequisite.SessionManagerPlugin],
    });

    expect(actual).toBe(false);
  });

  it("does not reload when the wizard only showed the welcomes", () => {
    const actual = changesWhatTabsRead({ ...FINISHED, completed: false });

    expect(actual).toBe(false);
  });
});
