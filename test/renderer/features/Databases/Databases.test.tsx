import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Databases from "@/renderer/features/Databases";

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  selectedDatabase: vi.fn(),
  selectedEnvironment: vi.fn(),
  connectionInfo: vi.fn(),
  status: vi.fn(),
  databaseConnectionErrors: vi.fn(),
  logsRead: vi.fn(),
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
    },
    errors: {
      databaseConnectionErrors: () => api.databaseConnectionErrors(),
    },
    logs: {
      read: (sourceId: string, cursor: unknown) =>
        api.logsRead(sourceId, cursor),
    },
  },
}));

beforeEach(function isolate() {
  api.catalog.mockReset().mockResolvedValue({});
  api.selectedDatabase.mockReset().mockResolvedValue("");
  api.selectedEnvironment.mockReset().mockResolvedValue("");
  api.connectionInfo.mockReset().mockResolvedValue(null);
  api.status.mockReset().mockResolvedValue("disconnected");
  api.databaseConnectionErrors.mockReset().mockResolvedValue([]);
  api.logsRead
    .mockReset()
    .mockResolvedValue({ lines: [], cursor: null, reset: false });
});

afterEach(function restoreRealTimers() {
  vi.useRealTimers();
});

describe("with nothing picked yet, the tab shows neither an error nor connection info", () => {
  it("renders no connection info panel", async () => {
    render(<Databases />);

    await waitFor(function settled() {
      expect(api.catalog).toHaveBeenCalled();
    });

    expect(screen.queryByText("Host")).toBeNull();
  });
});

describe("once a connection is picked, its details show", () => {
  it("shows host, port, database, username, and status", async () => {
    api.selectedDatabase.mockResolvedValue("TEAM_MEMBER");
    api.selectedEnvironment.mockResolvedValue("dev");
    api.connectionInfo.mockResolvedValue({
      host: "team-member.example.com",
      port: 5432,
      localPort: 5432,
      databaseName: "team_member_subgraph",
      username: "tm_user",
    });
    render(<Databases />);

    await screen.findByText("team-member.example.com");

    expect(screen.getByText("tm_user")).toBeDefined();
    expect(screen.getByText("team_member_subgraph")).toBeDefined();
    expect(screen.getByText("5432")).toBeDefined();
    expect(screen.getByText("Disconnected")).toBeDefined();
  });
});

describe("a reported failure shows as a banner above the connection info", () => {
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
