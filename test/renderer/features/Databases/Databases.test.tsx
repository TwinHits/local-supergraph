import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Databases from "@/renderer/features/Databases";

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  localPorts: vi.fn(),
  updateLocalPort: vi.fn(),
  statuses: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connectionInfo: vi.fn(),
  copyPasswordToClipboard: vi.fn(),
  copyPasswordUrlEncodedToClipboard: vi.fn(),
  currentEnvironment: vi.fn(),
  updateEnvironment: vi.fn(),
  databaseConnectionErrors: vi.fn(),
  ssoLogin: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    databases: {
      catalog: () => api.catalog(),
      localPorts: () => api.localPorts(),
      updateLocalPort: (database: string, environment: string, port: number) =>
        api.updateLocalPort(database, environment, port),
      statuses: () => api.statuses(),
      connect: (database: string, environment: string) =>
        api.connect(database, environment),
      disconnect: (database: string) => api.disconnect(database),
      connectionInfo: (database: string, environment: string) =>
        api.connectionInfo(database, environment),
      copyPasswordToClipboard: (database: string, environment: string) =>
        api.copyPasswordToClipboard(database, environment),
      copyPasswordUrlEncodedToClipboard: (
        database: string,
        environment: string
      ) => api.copyPasswordUrlEncodedToClipboard(database, environment),
      ssoLogin: (database: string, environment: string) =>
        api.ssoLogin(database, environment),
    },
    settings: {
      currentEnvironment: () => api.currentEnvironment(),
      updateEnvironment: (name: string) => api.updateEnvironment(name),
    },
    errors: {
      databaseConnectionErrors: () => api.databaseConnectionErrors(),
    },
  },
}));

beforeEach(function isolate() {
  api.catalog.mockReset().mockResolvedValue({});
  api.localPorts.mockReset().mockResolvedValue({});
  api.updateLocalPort.mockReset();
  api.statuses.mockReset().mockResolvedValue({});
  api.connect.mockReset().mockResolvedValue("connecting");
  api.disconnect.mockReset().mockResolvedValue("disconnected");
  api.connectionInfo.mockReset().mockResolvedValue(null);
  api.copyPasswordToClipboard.mockReset().mockResolvedValue(true);
  api.copyPasswordUrlEncodedToClipboard.mockReset().mockResolvedValue(true);
  api.currentEnvironment.mockReset().mockResolvedValue("dev");
  api.updateEnvironment
    .mockReset()
    .mockImplementation((name: string) => Promise.resolve(name));
  api.databaseConnectionErrors.mockReset().mockResolvedValue([]);
  api.ssoLogin.mockReset().mockResolvedValue(true);
});

afterEach(function restoreRealTimers() {
  vi.useRealTimers();
});

describe("with nothing in the catalog, the table has no rows and no error banner", () => {
  it("renders no database row", async () => {
    render(<Databases />);

    await waitFor(function settled() {
      expect(api.catalog).toHaveBeenCalled();
    });

    expect(screen.queryByText("TEAM_MEMBER")).toBeNull();
  });
});

describe("a database offered in the current environment shows as a row", () => {
  it("shows its name and disconnected status", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    render(<Databases />);

    await screen.findByText("TEAM_MEMBER");

    expect(screen.getByLabelText("disconnected")).toBeDefined();
  });
});

describe("a reported failure shows as a banner above the table", () => {
  it("shows the failure's summary and cause once the next poll picks it up", async () => {
    vi.useFakeTimers();
    api.databaseConnectionErrors.mockResolvedValue([
      {
        key: "AWS_SSO_EXPIRED",
        summary: "AWS credentials are stale",
        cause: "Your SSO session expired.",
        resolution: ["Sign in again"],
        raw: null,
      },
    ]);
    render(<Databases />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(
      screen.getByText("AWS credentials are stale: Your SSO session expired.")
    ).toBeDefined();
  });
});

describe("a stale AWS session's banner signs the failing database back in", () => {
  it("calls the bridge with the failing database and its environment when Login is clicked", async () => {
    vi.useFakeTimers();
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.databaseConnectionErrors.mockResolvedValue([
      {
        key: "AWS_SSO_EXPIRED",
        summary: "AWS credentials are stale",
        cause: "Your SSO session expired.",
        resolution: ["Sign in again"],
        raw: null,
        database: "TEAM_MEMBER",
      },
    ]);
    render(<Databases />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    vi.useRealTimers();

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(api.ssoLogin).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
  });
});

describe("paging away from an in-flight sign-in does not leave the next failure's button stuck pending", () => {
  it("shows the next database's Login button as idle, not disabled, after paging away", async () => {
    api.catalog.mockResolvedValue({
      TEAM_MEMBER: ["dev"],
      OTHER_MEMBER: ["dev"],
    });
    api.currentEnvironment.mockResolvedValue("dev");
    let resolveLogin: (succeeded: boolean) => void = () => {};
    api.ssoLogin.mockReset().mockImplementation(
      () =>
        new Promise<boolean>(function pending(resolve) {
          resolveLogin = resolve;
        })
    );
    api.databaseConnectionErrors.mockResolvedValue([
      {
        key: "AWS_SSO_EXPIRED",
        summary: "AWS credentials are stale for TEAM_MEMBER",
        cause: "Your SSO session expired.",
        resolution: ["Sign in again"],
        raw: null,
        database: "TEAM_MEMBER",
      },
      {
        key: "AWS_SSO_EXPIRED",
        summary: "AWS credentials are stale for OTHER_MEMBER",
        cause: "Your SSO session expired.",
        resolution: ["Sign in again"],
        raw: null,
        database: "OTHER_MEMBER",
      },
    ]);
    vi.useFakeTimers();
    render(<Databases />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    vi.useRealTimers();

    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    expect(
      screen.getByRole("button", { name: "Login" }).hasAttribute("disabled")
    ).toBe(false);

    await act(async () => {
      resolveLogin(true);
      await Promise.resolve();
    });
  });
});

describe("clicking the error banner opens the error modal", () => {
  it("shows the failure's resolution steps", async () => {
    vi.useFakeTimers();
    api.databaseConnectionErrors.mockResolvedValue([
      {
        key: "AWS_SSO_EXPIRED",
        summary: "AWS credentials are stale",
        cause: "Your SSO session expired.",
        resolution: ["Sign in again"],
        raw: null,
      },
    ]);
    render(<Databases />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    vi.useRealTimers();
    const notice = await screen.findByText(
      "AWS credentials are stale: Your SSO session expired."
    );

    await userEvent.click(notice);

    expect(await screen.findByText("Sign in again")).toBeDefined();
  });
});

describe("clicking a database row expands its connection-info drawer", () => {
  it("loads and shows the row's connection info", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.connectionInfo.mockResolvedValue({
      host: "team-member.example.rds.amazonaws.com",
      port: 5432,
      localPort: 5432,
      databaseName: "team_member",
      username: "app_user",
    });
    render(<Databases />);
    const name = await screen.findByText("TEAM_MEMBER");

    await userEvent.click(name);

    expect(api.connectionInfo).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
    expect(
      await screen.findByText("team-member.example.rds.amazonaws.com")
    ).toBeDefined();
    expect(screen.getByText("app_user")).toBeDefined();
  });

  it("collapses again on a second click", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.connectionInfo.mockResolvedValue({
      host: "team-member.example.rds.amazonaws.com",
      port: 5432,
      localPort: 5432,
      databaseName: "team_member",
      username: "app_user",
    });
    render(<Databases />);
    const name = await screen.findByText("TEAM_MEMBER");
    await userEvent.click(name);
    await screen.findByText("app_user");

    await userEvent.click(name);

    expect(screen.queryByText("app_user")).toBeNull();
  });

  it("shows a fallback message when the bridge has no connection info for the pick", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.connectionInfo.mockResolvedValue(null);
    render(<Databases />);
    const name = await screen.findByText("TEAM_MEMBER");

    await userEvent.click(name);

    expect(
      await screen.findByText("No connection info for this environment.")
    ).toBeDefined();
  });

  it("copies the password and the URL-encoded password from the drawer", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.connectionInfo.mockResolvedValue({
      host: "team-member.example.rds.amazonaws.com",
      port: 5432,
      localPort: 5432,
      databaseName: "team_member",
      username: "app_user",
    });
    render(<Databases />);
    const name = await screen.findByText("TEAM_MEMBER");
    await userEvent.click(name);
    await screen.findByText("app_user");

    await userEvent.click(
      screen.getByRole("button", { name: "Copy TEAM_MEMBER's password" })
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "Copy TEAM_MEMBER's password, URL-encoded",
      })
    );

    expect(api.copyPasswordToClipboard).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      "dev"
    );
    expect(api.copyPasswordUrlEncodedToClipboard).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      "dev"
    );
  });
});

describe("interactive cells inside a row do not also toggle its drawer", () => {
  it("does not expand the drawer when the local port field is clicked", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.localPorts.mockResolvedValue({ TEAM_MEMBER: { dev: 5432 } });
    render(<Databases />);
    await screen.findByText("TEAM_MEMBER");

    await userEvent.click(screen.getByDisplayValue("5432"));

    expect(api.connectionInfo).not.toHaveBeenCalled();
  });

  it("does not expand the drawer when the connect control is clicked", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    render(<Databases />);
    await screen.findByText("TEAM_MEMBER");

    await userEvent.click(
      screen.getByRole("button", { name: "Connect to the database" })
    );

    expect(api.connect).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
    expect(api.connectionInfo).not.toHaveBeenCalled();
  });
});
