import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDatabases } from "@/renderer/features/Databases/useDatabases";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  localPort: vi.fn(),
  updateLocalPort: vi.fn(),
  statuses: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  copyPasswordToClipboard: vi.fn(),
  copyPasswordUrlEncodedToClipboard: vi.fn(),
  currentEnvironment: vi.fn(),
  updateEnvironment: vi.fn(),
  databaseConnectionErrors: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    databases: {
      catalog: () => api.catalog(),
      localPort: (database: string) => api.localPort(database),
      updateLocalPort: (database: string, port: number) =>
        api.updateLocalPort(database, port),
      statuses: () => api.statuses(),
      connect: (database: string, environment: string) =>
        api.connect(database, environment),
      disconnect: (database: string) => api.disconnect(database),
      copyPasswordToClipboard: (database: string, environment: string) =>
        api.copyPasswordToClipboard(database, environment),
      copyPasswordUrlEncodedToClipboard: (
        database: string,
        environment: string
      ) => api.copyPasswordUrlEncodedToClipboard(database, environment),
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
  api.localPort.mockReset().mockResolvedValue(0);
  api.updateLocalPort
    .mockReset()
    .mockImplementation((_database, port) => Promise.resolve(port));
  api.statuses.mockReset().mockResolvedValue({});
  api.connect.mockReset().mockResolvedValue(DatabaseConnectionState.Connecting);
  api.disconnect
    .mockReset()
    .mockResolvedValue(DatabaseConnectionState.Disconnected);
  api.copyPasswordToClipboard.mockReset().mockResolvedValue(true);
  api.copyPasswordUrlEncodedToClipboard.mockReset().mockResolvedValue(true);
  api.currentEnvironment.mockReset().mockResolvedValue("dev");
  api.updateEnvironment
    .mockReset()
    .mockImplementation((name: string) => Promise.resolve(name));
  api.databaseConnectionErrors.mockReset().mockResolvedValue([]);
});

afterEach(function restoreRealTimers() {
  vi.useRealTimers();
});

describe("loading the catalog and the saved environment on mount", () => {
  it("shows a row for every database offered in the current environment", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev", "prod"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());

    await waitFor(function loaded() {
      expect(result.current.rows.map((row) => row.name)).toEqual([
        "TEAM_MEMBER",
      ]);
    });
    expect(result.current.environment).toBe("dev");
    expect(result.current.environments).toEqual(["dev", "prod"]);
  });

  it("falls back to the catalog's first environment when the saved one is gone", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev", "prod"] });
    api.currentEnvironment.mockResolvedValue("retired-environment");
    const { result } = renderHook(() => useDatabases());

    await waitFor(function fellBack() {
      expect(result.current.environment).toBe("dev");
    });
    expect(api.updateEnvironment).toHaveBeenCalledWith("dev");
  });

  it("does not list a database that isn't offered in any environment yet", async () => {
    const { result } = renderHook(() => useDatabases());

    await waitFor(function settled() {
      expect(api.catalog).toHaveBeenCalled();
    });

    expect(result.current.rows).toEqual([]);
  });
});

describe("a row stays visible with its real state even outside the current environment", () => {
  it("keeps showing a connected database after the environment no longer lists it", async () => {
    api.catalog.mockResolvedValue({
      TEAM_MEMBER: ["dev"],
      OTHER_DATABASE: ["dev", "staging"],
    });
    api.currentEnvironment.mockResolvedValue("dev");
    api.statuses.mockResolvedValue({
      TEAM_MEMBER: {
        state: DatabaseConnectionState.Connected,
        environment: "dev",
      },
    });
    vi.useFakeTimers();
    const { result } = renderHook(() => useDatabases());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.rows.map((row) => row.name)).toContain("TEAM_MEMBER");

    act(function switchToStaging() {
      result.current.selectEnvironment("staging");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    const row = result.current.rows.find((each) => each.name === "TEAM_MEMBER");
    expect(row).toBeDefined();
    expect(row?.state).toBe(DatabaseConnectionState.Connected);
  });
});

describe("switching the environment disconnects everything connected first", () => {
  it("disconnects every connecting or connected database before adopting the new environment", async () => {
    api.catalog.mockResolvedValue({
      TEAM_MEMBER: ["dev", "staging"],
      OTHER_DATABASE: ["dev", "staging"],
    });
    api.currentEnvironment.mockResolvedValue("dev");
    api.statuses.mockResolvedValue({
      TEAM_MEMBER: {
        state: DatabaseConnectionState.Connected,
        environment: "dev",
      },
      OTHER_DATABASE: {
        state: DatabaseConnectionState.Disconnected,
        environment: null,
      },
    });
    vi.useFakeTimers();
    const { result } = renderHook(() => useDatabases());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    act(function switchToStaging() {
      result.current.selectEnvironment("staging");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(api.disconnect).toHaveBeenCalledExactlyOnceWith("TEAM_MEMBER");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.environment).toBe("staging");
    expect(api.updateEnvironment).toHaveBeenCalledWith("staging");
  });

  it("does not disconnect anything when nothing is connected", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev", "staging"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.environment).toBe("dev");
    });

    act(function switchToStaging() {
      result.current.selectEnvironment("staging");
    });

    await waitFor(function switched() {
      expect(result.current.environment).toBe("staging");
    });
    expect(api.disconnect).not.toHaveBeenCalled();
  });
});

describe("status and errors are polled on an interval", () => {
  it("picks up a status change from main", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    vi.useFakeTimers();
    const { result } = renderHook(() => useDatabases());
    api.statuses.mockResolvedValue({
      TEAM_MEMBER: {
        state: DatabaseConnectionState.Connected,
        environment: "dev",
      },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    const row = result.current.rows.find((each) => each.name === "TEAM_MEMBER");
    expect(row?.state).toBe(DatabaseConnectionState.Connected);
  });

  it("picks up new database connection errors", async () => {
    const diagnosis = {
      key: "AWS_SSO_EXPIRED",
      summary: "AWS credentials are stale",
      cause: "Your SSO session expired.",
      resolution: ["Sign in again"],
      raw: null,
    };
    vi.useFakeTimers();
    const { result } = renderHook(() => useDatabases());
    api.databaseConnectionErrors.mockResolvedValue([diagnosis]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.errors).toEqual([diagnosis]);
  });
});

describe("connect and disconnect act on one row", () => {
  it("connect calls the bridge with the row's name and the current environment", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.environment).toBe("dev");
    });

    act(function connect() {
      result.current.connect("TEAM_MEMBER");
    });

    await waitFor(function connecting() {
      const row = result.current.rows.find(
        (each) => each.name === "TEAM_MEMBER"
      );
      expect(row?.state).toBe(DatabaseConnectionState.Connecting);
    });
    expect(api.connect).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
  });

  it("disconnect calls the bridge and adopts what it returns", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.environment).toBe("dev");
    });
    act(function connect() {
      result.current.connect("TEAM_MEMBER");
    });
    await waitFor(function connecting() {
      const row = result.current.rows.find(
        (each) => each.name === "TEAM_MEMBER"
      );
      expect(row?.state).toBe(DatabaseConnectionState.Connecting);
    });

    act(function disconnect() {
      result.current.disconnect("TEAM_MEMBER");
    });

    await waitFor(function disconnected() {
      const row = result.current.rows.find(
        (each) => each.name === "TEAM_MEMBER"
      );
      expect(row?.state).toBe(DatabaseConnectionState.Disconnected);
    });
    expect(api.disconnect).toHaveBeenCalledWith("TEAM_MEMBER");
  });
});

describe("copying the password calls the bridge with the row's own connected environment", () => {
  it("uses the toolbar's environment when the row isn't connected", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.environment).toBe("dev");
    });

    const actual = await result.current.copyPassword("TEAM_MEMBER");

    expect(api.copyPasswordToClipboard).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      "dev"
    );
    expect(actual).toBe(true);
  });

  it("uses the environment the row is actually connected under", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev", "staging"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.statuses.mockResolvedValue({
      TEAM_MEMBER: {
        state: DatabaseConnectionState.Connected,
        environment: "staging",
      },
    });
    vi.useFakeTimers();
    const { result } = renderHook(() => useDatabases());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await result.current.copyPassword("TEAM_MEMBER");

    expect(api.copyPasswordToClipboard).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      "staging"
    );
  });
});

describe("updating a row's local port", () => {
  it("calls the bridge and adopts the saved value", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.environment).toBe("dev");
    });

    act(function change() {
      result.current.updateLocalPort("TEAM_MEMBER", 9999);
    });

    await waitFor(function updated() {
      const row = result.current.rows.find(
        (each) => each.name === "TEAM_MEMBER"
      );
      expect(row?.localPort).toBe(9999);
    });
    expect(api.updateLocalPort).toHaveBeenCalledWith("TEAM_MEMBER", 9999);
  });
});
