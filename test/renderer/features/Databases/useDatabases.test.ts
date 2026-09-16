import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDatabases } from "@/renderer/features/Databases/useDatabases";

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  selectedDatabase: vi.fn(),
  selectedEnvironment: vi.fn(),
  connectionInfo: vi.fn(),
  status: vi.fn(),
  copyPasswordToClipboard: vi.fn(),
  updateSelectedDatabase: vi.fn(),
  updateSelectedEnvironment: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  databaseConnectionErrors: vi.fn(),
}));

vi.mock("@/renderer/api", () => ({
  api: {
    databases: {
      catalog: () => api.catalog(),
      selectedDatabase: () => api.selectedDatabase(),
      selectedEnvironment: () => api.selectedEnvironment(),
      connectionInfo: (database: string, environment: string) =>
        api.connectionInfo(database, environment),
      status: () => api.status(),
      copyPasswordToClipboard: (database: string, environment: string) =>
        api.copyPasswordToClipboard(database, environment),
      updateSelectedDatabase: (name: string) =>
        api.updateSelectedDatabase(name),
      updateSelectedEnvironment: (name: string) =>
        api.updateSelectedEnvironment(name),
      connect: (database: string, environment: string) =>
        api.connect(database, environment),
      disconnect: () => api.disconnect(),
    },
    errors: {
      databaseConnectionErrors: () => api.databaseConnectionErrors(),
    },
  },
}));

beforeEach(function isolate() {
  api.catalog.mockReset().mockResolvedValue({});
  api.selectedDatabase.mockReset().mockResolvedValue("");
  api.selectedEnvironment.mockReset().mockResolvedValue("");
  api.connectionInfo.mockReset().mockResolvedValue(null);
  api.status.mockReset().mockResolvedValue("disconnected");
  api.copyPasswordToClipboard.mockReset().mockResolvedValue(true);
  api.updateSelectedDatabase.mockReset();
  api.updateSelectedEnvironment.mockReset();
  api.connect.mockReset().mockResolvedValue("connecting");
  api.disconnect.mockReset().mockResolvedValue("disconnected");
  api.databaseConnectionErrors.mockReset().mockResolvedValue([]);
});

describe("loading the catalog and the saved selection on mount", () => {
  it("loads the catalog", async () => {
    api.catalog.mockResolvedValue({ TEAM_MEMBER: ["dev", "prod"] });
    const { result } = renderHook(() => useDatabases());

    await waitFor(function loaded() {
      expect(result.current.catalog).toEqual({
        TEAM_MEMBER: ["dev", "prod"],
      });
    });
  });

  it("loads the previously selected database and environment", async () => {
    api.selectedDatabase.mockResolvedValue("TEAM_MEMBER");
    api.selectedEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());

    await waitFor(function loaded() {
      expect(result.current.database).toBe("TEAM_MEMBER");
      expect(result.current.environment).toBe("dev");
    });
  });
});

describe("connection info only loads once both a database and environment are picked", () => {
  it("stays null when nothing is picked yet", async () => {
    const { result } = renderHook(() => useDatabases());

    await waitFor(function settled() {
      expect(api.catalog).toHaveBeenCalled();
    });

    expect(result.current.connectionInfo).toBeNull();
    expect(api.connectionInfo).not.toHaveBeenCalled();
  });

  it("loads connection info once both are set", async () => {
    api.selectedDatabase.mockResolvedValue("TEAM_MEMBER");
    api.selectedEnvironment.mockResolvedValue("dev");
    api.connectionInfo.mockResolvedValue({
      host: "team-member.example.com",
      port: 5432,
      localPort: 5432,
      databaseName: "team_member_subgraph",
      username: "tm_user",
    });
    const { result } = renderHook(() => useDatabases());

    await waitFor(function loaded() {
      expect(result.current.connectionInfo).toEqual({
        host: "team-member.example.com",
        port: 5432,
        localPort: 5432,
        databaseName: "team_member_subgraph",
        username: "tm_user",
      });
    });
    expect(api.connectionInfo).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
  });
});

describe("selecting a database or environment persists the choice", () => {
  it("selectDatabase calls the bridge and adopts what it returns", async () => {
    // Resolved to something distinct from the update, so the mount effect's
    // own async resolution is provably finished before selectDatabase runs —
    // otherwise it can land after and stomp the just-picked value back down.
    api.selectedDatabase.mockResolvedValue("OTHER_DATABASE");
    api.updateSelectedDatabase.mockResolvedValue("TEAM_MEMBER");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function mounted() {
      expect(result.current.database).toBe("OTHER_DATABASE");
    });

    act(function select() {
      result.current.selectDatabase("TEAM_MEMBER");
    });

    await waitFor(function updated() {
      expect(result.current.database).toBe("TEAM_MEMBER");
    });
    expect(api.updateSelectedDatabase).toHaveBeenCalledWith("TEAM_MEMBER");
  });

  it("selectEnvironment calls the bridge and adopts what it returns", async () => {
    api.selectedEnvironment.mockResolvedValue("iceqa01");
    api.updateSelectedEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function mounted() {
      expect(result.current.environment).toBe("iceqa01");
    });

    act(function select() {
      result.current.selectEnvironment("dev");
    });

    await waitFor(function updated() {
      expect(result.current.environment).toBe("dev");
    });
    expect(api.updateSelectedEnvironment).toHaveBeenCalledWith("dev");
  });
});

describe("status and errors are polled on an interval", () => {
  beforeEach(function useFakeTime() {
    vi.useFakeTimers();
  });

  afterEach(function useRealTime() {
    vi.useRealTimers();
  });

  it("picks up a status change from main", async () => {
    const { result } = renderHook(() => useDatabases());
    api.status.mockResolvedValue("connected");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.state).toBe("connected");
  });

  it("picks up new database connection errors", async () => {
    const diagnosis = {
      key: "AWS_SSO_EXPIRED",
      summary: "AWS credentials are stale",
      cause: "Your SSO session expired.",
      resolution: ["Sign in again"],
      raw: null,
    };
    const { result } = renderHook(() => useDatabases());
    api.databaseConnectionErrors.mockResolvedValue([diagnosis]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.errors).toEqual([diagnosis]);
  });
});

describe("connect and disconnect act on the current selection", () => {
  it("connect calls the bridge with the picked database and environment", async () => {
    api.selectedDatabase.mockResolvedValue("TEAM_MEMBER");
    api.selectedEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.database).toBe("TEAM_MEMBER");
    });

    act(function connect() {
      result.current.connect();
    });

    await waitFor(function connecting() {
      expect(result.current.state).toBe("connecting");
    });
    expect(api.connect).toHaveBeenCalledWith("TEAM_MEMBER", "dev");
  });

  it("disconnect calls the bridge and adopts what it returns", async () => {
    api.selectedDatabase.mockResolvedValue("TEAM_MEMBER");
    api.selectedEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.database).toBe("TEAM_MEMBER");
    });
    act(function connect() {
      result.current.connect();
    });
    await waitFor(function connecting() {
      expect(result.current.state).toBe("connecting");
    });

    act(function disconnect() {
      result.current.disconnect();
    });

    await waitFor(function disconnected() {
      expect(result.current.state).toBe("disconnected");
    });
    expect(api.disconnect).toHaveBeenCalledOnce();
  });
});

describe("copying the password calls the bridge with the current selection", () => {
  it("resolves with whatever the bridge resolves", async () => {
    api.selectedDatabase.mockResolvedValue("TEAM_MEMBER");
    api.selectedEnvironment.mockResolvedValue("dev");
    const { result } = renderHook(() => useDatabases());
    await waitFor(function loaded() {
      expect(result.current.database).toBe("TEAM_MEMBER");
    });

    const actual = await result.current.copyPassword();

    expect(api.copyPasswordToClipboard).toHaveBeenCalledWith(
      "TEAM_MEMBER",
      "dev"
    );
    expect(actual).toBe(true);
  });
});
