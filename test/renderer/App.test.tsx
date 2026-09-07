import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

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
        command: null,
        raw: "",
      },
      {
        key: "REMOTE_UNREACHABLE",
        summary: "The deployed URL did not answer",
        cause: "VPN is down.",
        resolution: ["Check the VPN"],
        command: null,
        raw: "",
      },
    ],
    settings: { routerPort: 4041 },
    setOverride: vi.fn(function noop() {
      return Promise.resolve({ starships: { local: true, port: 4002 } });
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
          return Promise.resolve({
            subgraphs: stub.subgraphs,
            failure: "none",
            message: "",
          });
        },
        reloadSubgraphs() {
          return Promise.resolve({
            subgraphs: stub.subgraphs,
            failure: "none",
            message: "",
          });
        },
      },
      subgraph: {
        overrides() {
          return Promise.resolve(stub.overrides);
        },
        health() {
          return Promise.resolve(stub.health);
        },
        setOverride: stub.setOverride,
      },
      errors: {
        diagnose() {
          return Promise.resolve(stub.diagnoses);
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
        selectVariant() {
          return Promise.resolve("staging");
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

  const actual = await screen.findByLabelText("starships port");

  expect((actual as HTMLInputElement).value).toBe("4002");
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

  expect(stub.setOverride).toHaveBeenCalledWith("characters", {
    local: true,
    port: null,
  });
});

test("clicking a failed status opens its errors", async () => {
  render(<App />);
  const status = await screen.findByRole("button", {
    name: "failed: Not answering",
  });

  await userEvent.click(status);

  expect(await screen.findByText("1 of 2")).toBeDefined();
});
