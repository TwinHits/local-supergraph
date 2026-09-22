import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconName } from "@/renderer/ui/IconGlyph";
import TabRail from "@/renderer/ui/TabRail";

const ITEMS = [
  { id: "supergraph", icon: IconName.Supergraph, label: "Supergraph" },
  { id: "databases", icon: IconName.Database, label: "Databases" },
];

describe("the rail lists every item by its label", () => {
  it("shows every item's label", () => {
    render(<TabRail items={ITEMS} activeId="supergraph" onChange={vi.fn()} />);

    expect(screen.getByText("Supergraph")).toBeDefined();
    expect(screen.getByText("Databases")).toBeDefined();
  });
});

describe("clicking an item reports its id", () => {
  it("reports the clicked item's id, not the active one", async () => {
    const onChange = vi.fn();
    render(<TabRail items={ITEMS} activeId="supergraph" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Databases" }));

    expect(onChange).toHaveBeenCalledWith("databases");
  });
});

describe("collapsing the rail hides labels, leaving only icons", () => {
  it("hides labels once collapsed", async () => {
    render(<TabRail items={ITEMS} activeId="supergraph" onChange={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse tabs" })
    );

    expect(screen.queryByText("Supergraph")).toBeNull();
    expect(screen.queryByText("Databases")).toBeNull();
  });

  it("restores labels once expanded again", async () => {
    render(<TabRail items={ITEMS} activeId="supergraph" onChange={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse tabs" })
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand tabs" }));

    expect(screen.getByText("Supergraph")).toBeDefined();
    expect(screen.getByText("Databases")).toBeDefined();
  });

  it("clicking an item still reports its id while collapsed", async () => {
    const onChange = vi.fn();
    render(<TabRail items={ITEMS} activeId="supergraph" onChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse tabs" })
    );

    await userEvent.click(screen.getByRole("button", { name: "Databases" }));

    expect(onChange).toHaveBeenCalledWith("databases");
  });
});
