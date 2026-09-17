import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Databases from "@/renderer/features/Databases";

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
  api.updateLocalPort.mockReset();
  api.statuses.mockReset().mockResolvedValue({});
  api.connect.mockReset().mockResolvedValue("connecting");
  api.disconnect.mockReset().mockResolvedValue("disconnected");
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
