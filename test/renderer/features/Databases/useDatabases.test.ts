import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDatabases } from "@/renderer/features/Databases/useDatabases";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

function ssoExpired(database: string): Diagnosis {
  return {
    key: ErrorKey.AwsSsoExpired,
    summary: "AWS credentials are stale",
    cause: "Your SSO session expired.",
    resolution: ["Sign in again"],
    raw: null,
    database,
    environment: "dev",
  };
}

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
  api.updateLocalPort
    .mockReset()
    .mockImplementation((_database, _environment, port) =>
      Promise.resolve(port)
    );
  api.statuses.mockReset().mockResolvedValue({});
  api.connect.mockReset().mockResolvedValue(DatabaseConnectionState.Connecting);
  api.disconnect
    .mockReset()
    .mockResolvedValue(DatabaseConnectionState.Disconnected);
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
      database: "TEAM_MEMBER",
      environment: "dev",
    };
    vi.useFakeTimers();
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    const { result } = renderHook(() => useDatabases());
    api.databaseConnectionErrors.mockResolvedValue([diagnosis]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.errors).toEqual([diagnosis]);
  });
});

describe("a database's error does not outlive a switch away from the environment it happened under", () => {
  it("drops a failed database's stale diagnosis once the toolbar moves to another environment", async () => {
    const diagnosis = {
      key: "AWS_SSO_EXPIRED",
      summary: "AWS credentials are stale",
      cause: "Your SSO session expired.",
      resolution: ["Sign in again"],
      raw: null,
      database: "TEAM_MEMBER",
      environment: "dev",
    };
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev", "staging"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.databaseConnectionErrors.mockResolvedValue([diagnosis]);
    vi.useFakeTimers();
    const { result } = renderHook(() => useDatabases());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.errors).toEqual([diagnosis]);

    // TEAM_MEMBER never connected (it only ever failed), so the disconnect
    // loop that switching environments runs has nothing to disconnect here —
    // this is exactly the gap that left a stale diagnosis showing before.
    act(function switchToStaging() {
      result.current.selectEnvironment("staging");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.errors).toEqual([]);
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

describe("connection info loads eagerly in the background, using the row's own connected environment", () => {
  it("uses the toolbar's environment when the row isn't connected", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const info = {
      host: "team-member.example.rds.amazonaws.com",
      port: 5432,
      localPort: 5432,
      databaseName: "team_member",
      username: "app",
    };
    api.connectionInfo.mockResolvedValue(info);
    const { result } = renderHook(() => useDatabases());

    await waitFor(function loaded() {
      expect(result.current.connectionInfoByName.TEAM_MEMBER).toEqual(info);
    });

    expect(api.connectionInfo).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
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
    renderHook(() => useDatabases());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(api.connectionInfo).toHaveBeenCalledWith("TEAM_MEMBER", "staging");
  });

  it("resolves null when the bridge has no entry for the pick", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.connectionInfo.mockResolvedValue(null);
    const { result } = renderHook(() => useDatabases());

    await waitFor(function loaded() {
      expect(result.current.connectionInfoByName.TEAM_MEMBER).toBeNull();
    });
  });
});

describe("signing back in resolves the profile for the database the failure is actually about", () => {
  it("calls the bridge with the diagnosis's database and the current environment", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.environment).toBe("dev");
    });

    const actual = await result.current.login(ssoExpired("TEAM_MEMBER"));

    expect(api.ssoLogin).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
    expect(actual).toBe(true);
  });

  it("uses the environment the database is actually connected under, not the toolbar's", async () => {
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

    await result.current.login(ssoExpired("TEAM_MEMBER"));

    expect(api.ssoLogin).toHaveBeenCalledWith("TEAM_MEMBER", "staging");
  });

  it("resolves false without calling the bridge for a diagnosis with no database", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev"] });
    api.currentEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.environment).toBe("dev");
    });

    const actual = await result.current.login({
      key: ErrorKey.Unknown,
      summary: "This error is not recognized",
      cause: "The app doesn't have a known explanation for this one.",
      resolution: ["No known fix for this error"],
      raw: null,
      database: null,
      environment: null,
    });

    expect(api.ssoLogin).not.toHaveBeenCalled();
    expect(actual).toBe(false);
  });
});

describe("updating a row's local port", () => {
  it("calls the bridge with the row's own environment and adopts the saved value", async () => {
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
    expect(api.updateLocalPort).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      "dev",
      9999
    );
  });

  it("does not affect the same database's port under a different environment", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev", "prod"] });
    api.currentEnvironment.mockResolvedValue("dev");
    api.localPorts.mockResolvedValue({
      TEAM_MEMBER: { dev: 5432, prod: 5433 },
    });
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

    act(function switchToProd() {
      result.current.selectEnvironment("prod");
    });

    await waitFor(function switched() {
      expect(result.current.environment).toBe("prod");
    });
    const row = result.current.rows.find((each) => each.name === "TEAM_MEMBER");
    expect(row?.localPort).toBe(5433);
  });
});
