import { act, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/renderer/App";

// vi.mock is hoisted above the file, so its fixtures have to be hoisted too.
const stub = vi.hoisted(function fixtures() {
  return {
    subgraphs: [
      { name: "characters", routingUrl: "https://characters.svc/graphql" },
      { name: "starships", routingUrl: "https://starships.svc/graphql" },
    ],
    overrides: { starships: { local: true, port: 4002 } },
    health: { characters: "reachable", starships: "unreachable" },
    diagnoses: [
      {
        key: "LOCAL_REFUSED",
        summary: "Nothing is listening on that port",
        cause: "The service is not running.",
        resolution: ["Start the service"],
        raw: null,
      },
      {
        key: "REMOTE_UNREACHABLE",
        summary: "The deployed URL did not answer",
        cause: "VPN is down.",
        resolution: ["Check the VPN"],
        raw: null,
      },
    ],
    supergraphErrors: [] as unknown[],
    settings: { routerPort: 4041 },
    disabled: [] as string[],
    updateOverride: vi.fn(function noop() {
      return Promise.resolve({ starships: { local: true, port: 4002 } });
    }),
    setSubgraphEnabled: vi.fn(function noop() {
      return Promise.resolve([]);
    }),
    onboardingStatus: {
      completed: true,
      configured: true,
      missing: [] as string[],
    },
    resolveStatus: null as null | (() => void),
    completeOnboarding: vi.fn(function noop() {
      return Promise.resolve(undefined);
    }),
    graphName: vi.fn(function answer() {
      return Promise.resolve("My-Graph");
    }),
  };
});

vi.mock("@/renderer/api", function stubBridge() {
  return {
    api: {
      environment: {
        graphName: stub.graphName,
      },
      onboarding: {
        status() {
          if (stub.resolveStatus === null) {
            return Promise.resolve(stub.onboardingStatus);
          }
          return new Promise(function waitForTest(resolve) {
            stub.resolveStatus = function release() {
              resolve(stub.onboardingStatus);
            };
          });
        },
        submitCredentials() {
          return Promise.resolve(true);
        },
        complete: stub.completeOnboarding,
      },
      apollo: {
        listSubgraphs() {
          return Promise.resolve(stub.subgraphs);
        },
        reloadSubgraphs() {
          return Promise.resolve(stub.subgraphs);
        },
        allVariants() {
          return Promise.resolve(["current", "staging"]);
        },
      },
      subgraph: {
        overrides() {
          return Promise.resolve(stub.overrides);
        },
        checkHealth() {
          return Promise.resolve(stub.health);
        },
        updateOverride: stub.updateOverride,
        disabledSubgraphs() {
          return Promise.resolve(stub.disabled);
        },
        setSubgraphEnabled: stub.setSubgraphEnabled,
      },
      errors: {
        subgraphErrors() {
          return Promise.resolve({ starships: stub.diagnoses });
        },
        supergraphErrors() {
          return Promise.resolve(stub.supergraphErrors);
        },
        databaseConnectionErrors() {
          return Promise.resolve([]);
        },
      },
      databases: {
        catalog() {
          return Promise.resolve({});
        },
        localPorts() {
          return Promise.resolve({});
        },
        updateLocalPort(_database: string, _environment: string, port: number) {
          return Promise.resolve(port);
        },
        statuses() {
          return Promise.resolve({});
        },
        connect() {
          return Promise.resolve("connecting");
        },
        disconnect() {
          return Promise.resolve("disconnected");
        },
        copyPasswordToClipboard() {
          return Promise.resolve(true);
        },
        copyPasswordUrlEncodedToClipboard() {
          return Promise.resolve(true);
        },
      },
      settings: {
        read() {
          return Promise.resolve(stub.settings);
        },
        update() {
          return Promise.resolve(stub.settings);
        },
        currentVariant() {
          return Promise.resolve("current");
        },
        updateVariant() {
          return Promise.resolve("staging");
        },
        variantFilter() {
          return Promise.resolve([]);
        },
        updateVariantFilter() {
          return Promise.resolve([]);
        },
        currentEnvironment() {
          return Promise.resolve("");
        },
        updateEnvironment(name: string) {
          return Promise.resolve(name);
        },
        routerAddress() {
          return Promise.resolve("http://localhost:4041");
        },
      },
      windowControls: {
        isMaximized() {
          return Promise.resolve(false);
        },
        minimize() {
          return Promise.resolve(undefined);
        },
        toggleMaximize() {
          return Promise.resolve(false);
        },
        close() {
          return Promise.resolve(undefined);
        },
        openExternal() {
          return Promise.resolve(undefined);
        },
      },
      clipboard: {
        copyText() {
          return Promise.resolve(undefined);
        },
      },
      supergraph: {
        start() {
          return Promise.resolve("stopped");
        },
        stop() {
          return Promise.resolve("stopped");
        },
        status() {
          return Promise.resolve("stopped");
        },
      },
    },
  };
});

describe("the table lists every subgraph from the registry", () => {
  it("lists every subgraph", async () => {
    render(<App />);
    await screen.findByText("https://characters.svc/graphql");

    // The Databases tab renders its own table while hidden, so scope to the
    // subgraph table specifically rather than every table in the document.
    const subgraphTable = screen.getAllByRole("table")[0];
    const rows = within(subgraphTable).getAllByRole("row");

    // One heading row, then one per subgraph.
    expect(rows.length).toBe(stub.subgraphs.length + 1);
  });

  it("shows the routing url for a remote subgraph", async () => {
    render(<App />);

    const actual = await screen.findByText("https://characters.svc/graphql");

    expect(actual).toBeDefined();
  });

  it("shows a port input instead of a url for a local subgraph", async () => {
    render(<App />);

    const actual = await screen.findByDisplayValue("4002");

    expect(actual).toBeDefined();
  });
});

describe("search filters the table", () => {
  it("search filters the rows", async () => {
    render(<App />);
    await screen.findByText("https://characters.svc/graphql");

    await userEvent.type(screen.getByLabelText("Search"), "starships");

    expect(screen.queryByText("https://characters.svc/graphql")).toBeNull();
  });
});

describe("toggling a subgraph local reports the change", () => {
  it("the toggle reports a subgraph going local", async () => {
    render(<App />);
    const toggle = await screen.findByLabelText("Run characters locally");

    await userEvent.click(toggle);

    expect(stub.updateOverride).toHaveBeenCalledWith("characters", {
      local: true,
      port: null,
    });
  });
});

describe("a failed status opens the error modal", () => {
  it("clicking a failed status opens its errors", async () => {
    render(<App />);
    const status = await screen.findByRole("button", {
      name: "failed: Nothing is listening on that port",
    });

    await userEvent.click(status);

    expect(
      await screen.findByText("Nothing is listening on that port")
    ).toBeDefined();
  });
});

describe("a supergraph failure shows above the table and opens the same modal a row would", () => {
  afterEach(function forgetSupergraphErrors() {
    stub.supergraphErrors = [];
  });

  it("a supergraph the registry would not answer for says so above the table", async () => {
    stub.supergraphErrors = [
      {
        key: "APOLLO_KEY_INVALID",
        summary: "Apollo rejected the key",
        cause: "APOLLO_KEY is invalid or has expired.",
        resolution: ["Regenerate the key"],
        raw: "401 Unauthorized",
      },
    ];

    render(<App />);

    const actual = await screen.findByText(
      "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
    );

    expect(actual).toBeDefined();
  });

  it("the supergraph's failure opens the same modal the rows use", async () => {
    stub.supergraphErrors = [
      {
        key: "APOLLO_KEY_INVALID",
        summary: "Apollo rejected the key",
        cause: "APOLLO_KEY is invalid or has expired.",
        resolution: ["Regenerate the key"],
        raw: "401 Unauthorized",
      },
      {
        key: "GRAPH_NOT_FOUND",
        summary: "The key cannot see that graph",
        cause: "The graph or variant does not exist.",
        resolution: ["Check the variant"],
        raw: null,
      },
    ];
    render(<App />);
    const notice = await screen.findByText(
      "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
    );

    await userEvent.click(notice);

    expect(await screen.findByText("Regenerate the key")).toBeDefined();
  });

  it("the notice steps through the supergraph's other failures", async () => {
    stub.supergraphErrors = [
      {
        key: "APOLLO_KEY_INVALID",
        summary: "Apollo rejected the key",
        cause: "APOLLO_KEY is invalid or has expired.",
        resolution: ["Regenerate the key"],
        raw: "401 Unauthorized",
      },
      {
        key: "GRAPH_NOT_FOUND",
        summary: "The key cannot see that graph",
        cause: "The graph or variant does not exist.",
        resolution: ["Check the variant"],
        raw: null,
      },
    ];
    render(<App />);
    await screen.findByText(
      "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
    );

    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    expect(
      screen.getByText(
        "The key cannot see that graph: The graph or variant does not exist."
      )
    ).toBeDefined();
  });
});

const FINISHED_SETUP = { completed: true, configured: true, missing: [] };

describe("the normal screen does not render until the check finishes, and neither does the wizard", () => {
  afterEach(function releaseTheCheck() {
    stub.resolveStatus = null;
  });

  it("shows neither the tabs nor the wizard while the check is running", async () => {
    stub.resolveStatus = function pending() {};
    render(<App />);

    const spinner = await screen.findByRole("progressbar", {
      name: "Checking your setup",
    });

    expect(spinner).toBeDefined();
    expect(screen.queryByLabelText("Search")).toBeNull();
    expect(screen.queryByLabelText("Set up the app")).toBeNull();
  });

  it("shows the tabs once the check finds nothing to do", async () => {
    stub.resolveStatus = function pending() {};
    render(<App />);
    await screen.findByRole("progressbar", { name: "Checking your setup" });

    act(function finishTheCheck() {
      stub.resolveStatus?.();
    });

    expect(await screen.findByLabelText("Search")).toBeDefined();
  });

  it("shows the wizard once the check finds something to do", async () => {
    stub.resolveStatus = function pending() {};
    stub.onboardingStatus = { ...FINISHED_SETUP, completed: false };
    render(<App />);
    await screen.findByRole("progressbar", { name: "Checking your setup" });

    act(function finishTheCheck() {
      stub.resolveStatus?.();
    });

    expect(
      await screen.findByRole("heading", { name: "How to use Supergraph" })
    ).toBeDefined();
    stub.onboardingStatus = FINISHED_SETUP;
  });
});

describe("the wizard shows when it has never been completed on the app's current version", () => {
  afterEach(function restoreFinishedSetup() {
    stub.onboardingStatus = FINISHED_SETUP;
  });

  it("shows over the app", async () => {
    stub.onboardingStatus = { ...FINISHED_SETUP, completed: false };
    render(<App />);

    const actual = await screen.findByRole("heading", {
      name: "How to use Supergraph",
    });

    expect(actual).toBeDefined();
  });
});

describe("the wizard shows when the Apollo credentials or any prerequisite is missing, even after it has been completed", () => {
  afterEach(function restoreFinishedSetup() {
    stub.onboardingStatus = FINISHED_SETUP;
  });

  it("shows when a prerequisite is missing", async () => {
    stub.onboardingStatus = { ...FINISHED_SETUP, missing: ["aws-cli"] };
    render(<App />);

    const actual = await screen.findByRole("heading", {
      name: "Install the AWS CLI",
    });

    expect(actual).toBeDefined();
  });

  it("shows when the Apollo credentials are missing", async () => {
    stub.onboardingStatus = { ...FINISHED_SETUP, configured: false };
    render(<App />);

    const actual = await screen.findByRole("heading", {
      name: "Connect to Apollo",
    });

    expect(actual).toBeDefined();
  });
});

describe("the wizard does not show when it has been completed and nothing is missing", () => {
  it("shows only the app", async () => {
    render(<App />);
    await screen.findByLabelText("Search");

    const actual = screen.queryByLabelText("Set up the app");

    expect(actual).toBeNull();
  });
});

describe("while the wizard is open, the app behind it cannot be used, and the wizard cannot be dismissed", () => {
  beforeEach(function unfinishedSetup() {
    stub.onboardingStatus = { ...FINISHED_SETUP, completed: false };
  });

  afterEach(function restoreFinishedSetup() {
    stub.onboardingStatus = FINISHED_SETUP;
  });

  it("stays open when Escape is pressed", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });

    await userEvent.keyboard("{Escape}");

    expect(
      screen.getByRole("heading", { name: "How to use Supergraph" })
    ).toBeDefined();
  });

  it("hides the app's own controls from interaction", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });

    const rendered = await screen.findByRole("button", {
      name: "Start supergraph",
      hidden: true,
    });
    const actual = screen.queryByRole("button", { name: "Start supergraph" });

    expect(rendered).toBeDefined();
    expect(actual).toBeNull();
  });
});

describe("finishing the wizard is remembered across restarts, until the app's version changes", () => {
  beforeEach(function unfinishedSetup() {
    stub.onboardingStatus = { ...FINISHED_SETUP, completed: false };
    stub.completeOnboarding.mockClear();
  });

  afterEach(function restoreFinishedSetup() {
    stub.onboardingStatus = FINISHED_SETUP;
  });

  it("records that the wizard was finished", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(function recorded() {
      expect(stub.completeOnboarding).toHaveBeenCalledOnce();
    });
  });
});

describe("after the wizard closes, every tab shows the configuration it set up", () => {
  beforeEach(function forgetEarlierReads() {
    stub.graphName.mockClear();
  });

  afterEach(function restoreFinishedSetup() {
    stub.onboardingStatus = FINISHED_SETUP;
  });

  it("reads the graph again when the wizard set up the credentials", async () => {
    stub.onboardingStatus = { ...FINISHED_SETUP, configured: false };
    render(<App />);
    await screen.findByRole("heading", { name: "Connect to Apollo" });
    await waitFor(function readBehindTheWizard() {
      expect(stub.graphName).toHaveBeenCalled();
    });
    const readsBeforeClosing = stub.graphName.mock.calls.length;

    await userEvent.type(screen.getByLabelText("Apollo API key"), "user:abc");
    await userEvent.type(
      screen.getByLabelText("Graph ref"),
      "my-graph@current"
    );
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(function readAgain() {
      expect(stub.graphName.mock.calls.length).toBeGreaterThan(
        readsBeforeClosing
      );
    });
  });

  it("shows the tabs once the wizard closes", async () => {
    stub.onboardingStatus = { ...FINISHED_SETUP, completed: false };
    render(<App />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(
      await screen.findByRole("button", { name: "Start supergraph" })
    ).toBeDefined();
  });
});

describe("after the wizard closes, a tab reloads only when the wizard changed something it read", () => {
  beforeEach(function forgetEarlierReads() {
    stub.graphName.mockClear();
  });

  afterEach(function restoreFinishedSetup() {
    stub.onboardingStatus = FINISHED_SETUP;
  });

  it("does not reload the tabs when the wizard changed nothing they read", async () => {
    stub.onboardingStatus = { ...FINISHED_SETUP, completed: false };
    render(<App />);
    await screen.findByRole("heading", { name: "How to use Supergraph" });
    await waitFor(function readBehindTheWizard() {
      expect(stub.graphName).toHaveBeenCalled();
    });
    const readsBeforeClosing = stub.graphName.mock.calls.length;

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(function closed() {
      expect(screen.queryByLabelText("Set up the app")).toBeNull();
    });

    expect(stub.graphName.mock.calls.length).toBe(readsBeforeClosing);
  });
});
