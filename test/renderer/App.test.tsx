import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

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
  };
});

vi.mock("@/renderer/api", function stubBridge() {
  return {
    api: {
      environment: {
        graphName() {
          return Promise.resolve("My-Graph");
        },
        variants() {
          return Promise.resolve(["current", "staging"]);
        },
      },
      apollo: {
        listSubgraphs() {
          return Promise.resolve(stub.subgraphs);
        },
        reloadSubgraphs() {
          return Promise.resolve(stub.subgraphs);
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

test("lists every subgraph", async () => {
  render(<App />);
  await screen.findByText("https://characters.svc/graphql");

  const rows = screen.getAllByRole("row");

  // One heading row, then one per subgraph.
  expect(rows.length).toBe(stub.subgraphs.length + 1);
});

test("shows the routing url for a remote subgraph", async () => {
  render(<App />);

  const actual = await screen.findByText("https://characters.svc/graphql");

  expect(actual).toBeDefined();
});

test("shows a port input instead of a url for a local subgraph", async () => {
  render(<App />);

  const actual = await screen.findByDisplayValue("4002");

  expect(actual).toBeDefined();
});

test("search filters the rows", async () => {
  render(<App />);
  await screen.findByText("https://characters.svc/graphql");

  await userEvent.type(screen.getByLabelText("Search"), "starships");

  expect(screen.queryByText("https://characters.svc/graphql")).toBeNull();
});

test("the toggle reports a subgraph going local", async () => {
  render(<App />);
  const toggle = await screen.findByLabelText("Run characters locally");

  await userEvent.click(toggle);

  expect(stub.updateOverride).toHaveBeenCalledWith("characters", {
    local: true,
    port: null,
  });
});

test("clicking a failed status opens its errors", async () => {
  render(<App />);
  const status = await screen.findByRole("button", {
    name: "failed: Nothing is listening on that port",
  });

  await userEvent.click(status);

  expect(
    await screen.findByText("Nothing is listening on that port")
  ).toBeDefined();
});

afterEach(function forgetSupergraphErrors() {
  stub.supergraphErrors = [];
});

test("a supergraph the registry would not answer for says so above the table", async () => {
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

test("the supergraph's failure opens the same modal the rows use", async () => {
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

test("the notice steps through the supergraph's other failures", async () => {
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
