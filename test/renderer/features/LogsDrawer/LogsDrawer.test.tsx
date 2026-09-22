import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LogsDrawer from "@/renderer/features/LogsDrawer/LogsDrawer";
import { LogsDrawerState } from "@/renderer/features/LogsDrawer/LogsDrawer.types";
import { type useLogsDrawer } from "@/renderer/features/LogsDrawer/useLogsDrawer";

/** A drawer control stub for one state, with every action mocked. */
function stubDrawer(state: LogsDrawerState): ReturnType<typeof useLogsDrawer> {
  return {
    state,
    lines: [],
    notifyStarted: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    restore: vi.fn(),
    clear: vi.fn(),
  };
}

describe("hidden until launched, the drawer shows nothing", () => {
  it("renders nothing when hidden", () => {
    const { container } = render(
      <LogsDrawer drawer={stubDrawer(LogsDrawerState.Hidden)} />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe("minimized state only offers a way back to the open size", () => {
  it("shows just the restore control, not a way to jump straight to full screen", () => {
    render(<LogsDrawer drawer={stubDrawer(LogsDrawerState.Minimized)} />);

    expect(screen.queryByRole("button", { name: "Maximize logs" })).toBeNull();
    expect(screen.getByRole("button", { name: "Restore logs" })).toBeDefined();
  });

  it("restoring from minimized returns to the open size", async () => {
    const drawer = stubDrawer(LogsDrawerState.Minimized);
    render(<LogsDrawer drawer={drawer} />);

    await userEvent.click(screen.getByRole("button", { name: "Restore logs" }));

    expect(drawer.restore).toHaveBeenCalledOnce();
  });
});

describe("the open header offers clear, minimize, and a way to fill the screen", () => {
  it("clicking clear reports a clear", async () => {
    const drawer = stubDrawer(LogsDrawerState.Open);
    render(<LogsDrawer drawer={drawer} />);

    await userEvent.click(screen.getByRole("button", { name: "Clear logs" }));

    expect(drawer.clear).toHaveBeenCalledOnce();
  });

  it("clicking minimize shrinks to the bar", async () => {
    const drawer = stubDrawer(LogsDrawerState.Open);
    render(<LogsDrawer drawer={drawer} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Minimize logs" })
    );

    expect(drawer.minimize).toHaveBeenCalledOnce();
  });

  it("offers to fill the screen, not to restore, while at the open size", async () => {
    const drawer = stubDrawer(LogsDrawerState.Open);
    render(<LogsDrawer drawer={drawer} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Maximize logs" })
    );

    expect(drawer.maximize).toHaveBeenCalledOnce();
  });
});

describe("maximized swaps the fill-screen control for a way back down", () => {
  it("offers restore instead of maximize once full screen", () => {
    render(<LogsDrawer drawer={stubDrawer(LogsDrawerState.Maximized)} />);

    expect(screen.queryByRole("button", { name: "Maximize logs" })).toBeNull();
    expect(screen.getByRole("button", { name: "Restore logs" })).toBeDefined();
  });

  it("clicking restore returns to the open size", async () => {
    const drawer = stubDrawer(LogsDrawerState.Maximized);
    render(<LogsDrawer drawer={drawer} />);

    await userEvent.click(screen.getByRole("button", { name: "Restore logs" }));

    expect(drawer.restore).toHaveBeenCalledOnce();
  });
});
