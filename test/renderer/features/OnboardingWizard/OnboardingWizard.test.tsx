import { act, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingWizard, {
  useOnboardingWizard,
} from "@/renderer/features/OnboardingWizard";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";
import {
  type OnboardingStatus,
  Prerequisite,
} from "@/shared/onboarding/onboarding.types";

const api = vi.hoisted(() => ({
  status: vi.fn(),
  submitCredentials: vi.fn(),
  supergraphErrors: vi.fn(),
  complete: vi.fn(),
  openExternal: vi.fn(),
  copyText: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    onboarding: {
      status: () => api.status(),
      submitCredentials: (...args: unknown[]) => api.submitCredentials(...args),
      complete: () => api.complete(),
    },
    windowControls: {
      openExternal: (url: string) => api.openExternal(url),
    },
    clipboard: {
      copyText: (text: string) => api.copyText(text),
    },
    errors: {
      supergraphErrors: () => api.supergraphErrors(),
    },
  },
}));

const REJECTED_KEY: Diagnosis = {
  key: ErrorKey.ApolloKeyInvalid,
  summary: "The Apollo API key was rejected",
  cause: "The key is missing, expired, or doesn't have access to the graph.",
  resolution: ["Regenerate the key at studio.apollographql.com"],
  raw: "401 Unauthorized",
  database: null,
  environment: null,
};

const RESTART_HINT = "Still not found after you installed it? Restart the app.";

function statusOf(overrides: Partial<OnboardingStatus>): OnboardingStatus {
  return { completed: true, configured: true, missing: [], ...overrides };
}

function Wizard() {
  const wizard = useOnboardingWizard();
  return <OnboardingWizard wizard={wizard} />;
}

async function typeCredentials(apolloKey: string, graphRef: string) {
  await userEvent.type(
    await screen.findByLabelText("Apollo API key"),
    apolloKey
  );
  await userEvent.type(screen.getByLabelText("Graph ref"), graphRef);
}

/** The step list, which the wizard renders before the step itself. */
function getStepList(): HTMLElement {
  return screen.getAllByRole("list")[0];
}

/** The name of every entry in the step list, without its marker. */
function readStepList(): string[] {
  return within(getStepList())
    .getAllByRole("listitem")
    .map(function toLabel(item) {
      return item.lastChild?.textContent ?? "";
    });
}

beforeEach(function isolate() {
  api.status.mockReset();
  api.submitCredentials.mockReset().mockResolvedValue(true);
  api.supergraphErrors.mockReset().mockResolvedValue([REJECTED_KEY]);
  api.complete.mockReset().mockResolvedValue(undefined);
  api.openExternal.mockReset().mockResolvedValue(undefined);
  api.copyText.mockReset().mockResolvedValue(undefined);
});

describe("a step cannot be continued past until its check passes", () => {
  it("keeps Continue disabled while the prerequisite is missing", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.AwsCli] }));
    render(<Wizard />);

    const actual = await screen.findByRole("button", { name: "Done" });

    expect(actual).toHaveProperty("disabled", true);
  });

  it("enables Continue once the prerequisite is found", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.AwsCli] }));
    render(<Wizard />);
    await screen.findByText("Not found");
    api.status.mockResolvedValue(statusOf({}));

    await userEvent.click(screen.getByRole("button", { name: "Check again" }));

    await waitFor(function enabled() {
      expect(screen.getByRole("button", { name: "Done" })).toHaveProperty(
        "disabled",
        false
      );
    });
  });

  it("does not advance on its own once the prerequisite is found", async () => {
    api.status.mockResolvedValue(
      statusOf({ missing: [Prerequisite.Rover, Prerequisite.AwsCli] })
    );
    render(<Wizard />);
    await screen.findByRole("heading", { name: "Install rover" });
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.AwsCli] }));

    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    await screen.findByText("Found");

    expect(
      screen.getByRole("heading", { name: "Install rover" })
    ).toBeDefined();
  });

  it("moves to the next step when Continue is pressed", async () => {
    api.status.mockResolvedValue(
      statusOf({ missing: [Prerequisite.Rover, Prerequisite.AwsCli] })
    );
    render(<Wizard />);
    await screen.findByRole("heading", { name: "Install rover" });
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.AwsCli] }));
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    await screen.findByText("Found");

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "Install the AWS CLI" })
    ).toBeDefined();
  });

  it("presses Continue when Enter is pressed and Continue is enabled", async () => {
    api.status.mockResolvedValue(statusOf({ configured: false }));
    render(<Wizard />);

    await typeCredentials("user:abc", "my-graph@current{Enter}");

    await waitFor(function submitted() {
      expect(api.submitCredentials).toHaveBeenCalledOnce();
    });
  });
});

describe("a prerequisite is checked again on request, and whenever the window regains focus", () => {
  it("checks again when Check again is pressed", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.Rover] }));
    render(<Wizard />);
    await screen.findByText("Not found");
    api.status.mockResolvedValue(statusOf({}));

    await userEvent.click(screen.getByRole("button", { name: "Check again" }));

    expect(await screen.findByText("Found")).toBeDefined();
  });

  it("checks again when the window regains focus", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.Rover] }));
    render(<Wizard />);
    await screen.findByText("Not found");
    api.status.mockResolvedValue(statusOf({}));

    act(function returnToTheApp() {
      window.dispatchEvent(new Event("focus"));
    });

    expect(await screen.findByText("Found")).toBeDefined();
  });

  it("stops checking on focus once the wizard is closed", async () => {
    api.status.mockResolvedValue(statusOf({ completed: false }));
    render(<Wizard />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(function closed() {
      expect(screen.queryByLabelText("Set up the app")).toBeNull();
    });
    const checksBeforeFocus = api.status.mock.calls.length;

    act(function returnToTheApp() {
      window.dispatchEvent(new Event("focus"));
    });

    expect(api.status.mock.calls.length).toBe(checksBeforeFocus);
  });
});

describe("each prerequisite step says how to set it up, with a link to open or a command to copy", () => {
  it("lists the steps to follow", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.AwsCli] }));
    render(<Wizard />);

    expect(await screen.findByText("Open the install guide.")).toBeDefined();
    expect(
      screen.getByText("Follow the steps for your computer.")
    ).toBeDefined();
    expect(screen.getByText('Press "Check again".')).toBeDefined();
  });

  it("opens the install guide through the app", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.Rover] }));
    render(<Wizard />);

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Open the rover install guide",
      })
    );

    expect(api.openExternal).toHaveBeenCalledWith(
      "https://www.apollographql.com/docs/rover/getting-started"
    );
  });

  it("shows the command to run for a missing file", async () => {
    api.status.mockResolvedValue(
      statusOf({ missing: [Prerequisite.DatabasesConfig] })
    );
    render(<Wizard />);

    const actual = await screen.findByText(
      "cp databases.json.template databases.json"
    );

    expect(actual).toBeDefined();
  });

  it("suggests restarting when an installed tool is still missing", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.AwsCli] }));
    render(<Wizard />);

    const actual = await screen.findByText(RESTART_HINT);

    expect(actual).toBeDefined();
  });

  it("does not suggest restarting for a missing file", async () => {
    api.status.mockResolvedValue(
      statusOf({ missing: [Prerequisite.DatabasesConfig] })
    );
    render(<Wizard />);
    await screen.findByText("Not found");

    const actual = screen.queryByText(RESTART_HINT);

    expect(actual).toBeNull();
  });
});

describe("text copied from the wizard lands on the system clipboard", () => {
  it("copies the databases.json command through the app", async () => {
    api.status.mockResolvedValue(
      statusOf({ missing: [Prerequisite.DatabasesConfig] })
    );
    render(<Wizard />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Copy the command" })
    );

    expect(api.copyText).toHaveBeenCalledWith(
      "cp databases.json.template databases.json"
    );
  });
});

describe("credentials can be submitted only once both values are complete", () => {
  beforeEach(function missingCredentials() {
    api.status.mockResolvedValue(statusOf({ configured: false }));
  });

  it("keeps Continue disabled with no graph ref", async () => {
    render(<Wizard />);
    await userEvent.type(
      await screen.findByLabelText("Apollo API key"),
      "user:abc"
    );

    const actual = screen.getByRole("button", { name: "Done" });

    expect(actual).toHaveProperty("disabled", true);
  });

  it("keeps Continue disabled with a graph ref that has no variant", async () => {
    render(<Wizard />);
    await typeCredentials("user:abc", "my-graph");

    const actual = screen.getByRole("button", { name: "Done" });

    expect(actual).toHaveProperty("disabled", true);
  });

  it("enables Continue once both values are complete", async () => {
    render(<Wizard />);
    await typeCredentials("user:abc", "my-graph@current");

    const actual = screen.getByRole("button", { name: "Done" });

    expect(actual).toHaveProperty("disabled", false);
  });

  it("says what shape the graph ref needs", async () => {
    render(<Wizard />);
    await typeCredentials("user:abc", "my-graph");

    const actual = screen.getByText("Use name@variant");

    expect(actual).toBeDefined();
  });
});

describe("a rejected key or unknown graph shows the same diagnosis the Supergraph tab would show", () => {
  beforeEach(function missingCredentials() {
    api.status.mockResolvedValue(
      statusOf({ configured: false, completed: false })
    );
  });

  it("shows the recorded supergraph failure and stays on the step", async () => {
    api.submitCredentials.mockResolvedValue(false);
    render(<Wizard />);
    await typeCredentials("user:bad", "my-graph@current");

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText(
        "The Apollo API key was rejected: The key is missing, expired, or doesn't have access to the graph."
      )
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Connect to Apollo" })
    ).toBeDefined();
  });
});

describe("credentials can be corrected and resubmitted without restarting the app", () => {
  beforeEach(function missingCredentials() {
    api.status.mockResolvedValue(
      statusOf({ configured: false, completed: false })
    );
  });

  it("keeps the typed values after a rejection so they can be corrected", async () => {
    api.submitCredentials.mockResolvedValue(false);
    render(<Wizard />);
    await typeCredentials("user:bad", "my-graph@current");

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText(/The Apollo API key was rejected/);

    expect(screen.getByDisplayValue("my-graph@current")).toBeDefined();
  });

  it("moves on once a corrected key is accepted", async () => {
    api.submitCredentials.mockResolvedValueOnce(false);
    render(<Wizard />);
    await typeCredentials("user:bad", "my-graph@current");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText(/The Apollo API key was rejected/);

    await userEvent.clear(screen.getByLabelText("Apollo API key"));
    await userEvent.type(screen.getByLabelText("Apollo API key"), "user:good");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "How to use Supergraph" })
    ).toBeDefined();
  });
});

describe("credentials are saved only after the registry accepts them", () => {
  beforeEach(function missingCredentials() {
    api.status.mockResolvedValue(statusOf({ configured: false }));
  });

  it("sends the values without the whitespace around them", async () => {
    render(<Wizard />);
    await typeCredentials(" user:abc ", " my-graph@current ");

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(api.submitCredentials).toHaveBeenCalledWith({
      apolloKey: "user:abc",
      graphRef: "my-graph@current",
    });
  });

  it("hides the key as it is typed", async () => {
    render(<Wizard />);
    const field = await screen.findByLabelText("Apollo API key");

    await userEvent.type(field, "user:abc");

    expect(field.getAttribute("type")).toBe("password");
  });
});

describe("every tab has its own welcome step, and they show only when the wizard has never been completed", () => {
  it("shows how to use the Supergraph tab first", async () => {
    api.status.mockResolvedValue(statusOf({ completed: false }));
    render(<Wizard />);

    await screen.findByRole("heading", { name: "How to use Supergraph" });

    expect(screen.getByText("Pick a variant in the toolbar.")).toBeDefined();
  });

  it("shows how to use the Databases tab next", async () => {
    api.status.mockResolvedValue(statusOf({ completed: false }));
    render(<Wizard />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "How to use Databases" })
    ).toBeDefined();
    expect(
      screen.getByText("Pick an environment from the dropdown.")
    ).toBeDefined();
  });

  it("leaves the welcome steps out once the wizard was finished", async () => {
    api.status.mockResolvedValue(statusOf({ missing: [Prerequisite.Rover] }));
    render(<Wizard />);
    await screen.findByRole("heading", { name: "Install rover" });

    const actual = readStepList();

    expect(actual).toEqual(["Rover"]);
  });
});

describe("the step list names every step, and the footer says where the current step is", () => {
  beforeEach(function everythingToDo() {
    api.status.mockResolvedValue({
      completed: false,
      configured: false,
      missing: [Prerequisite.Rover],
    });
  });

  it("names every step in order", async () => {
    render(<Wizard />);
    await screen.findByRole("heading", { name: "Install rover" });

    const actual = readStepList();

    expect(actual).toEqual([
      "Rover",
      "Apollo credentials",
      "Supergraph",
      "Databases",
    ]);
  });

  it("marks the current step", async () => {
    render(<Wizard />);
    await screen.findByRole("heading", { name: "Install rover" });

    const actual = within(getStepList())
      .getAllByRole("listitem")
      .find(function isCurrent(item) {
        return item.getAttribute("aria-current") === "step";
      });

    expect(actual?.lastChild?.textContent).toBe("Rover");
  });

  it("says which step of how many is showing", async () => {
    render(<Wizard />);

    const actual = await screen.findByText("Step 1 of 4");

    expect(actual).toBeDefined();
  });
});

describe("finishing the wizard is remembered across restarts, until the app's version changes", () => {
  it("records completion when Done is pressed on the last step", async () => {
    api.status.mockResolvedValue(statusOf({ completed: false }));
    render(<Wizard />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(function recorded() {
      expect(api.complete).toHaveBeenCalledOnce();
    });
  });

  it("closes once completion is recorded", async () => {
    api.status.mockResolvedValue(statusOf({ completed: false }));
    render(<Wizard />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(function closed() {
      expect(screen.queryByLabelText("Set up the app")).toBeNull();
    });
  });
});
