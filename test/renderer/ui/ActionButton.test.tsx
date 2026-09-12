import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ActionButton from "@/renderer/ui/ActionButton";

describe("a basic action button", () => {
  it("shows its label", () => {
    const expected = "Start Supergraph";

    render(<ActionButton onClick={vi.fn()}>{expected}</ActionButton>);

    expect(screen.getByRole("button").textContent).toBe(expected);
  });

  it("reports a click", async () => {
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Retry</ActionButton>);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  // user-event refuses to click a disabled button, the same way a browser does,
  // so the requirement is expressed as the state that blocks the click.
  it("is disabled when told to be", () => {
    render(
      <ActionButton onClick={vi.fn()} disabled>
        Retry
      </ActionButton>
    );

    const actual = screen.getByRole("button");

    expect(actual.hasAttribute("disabled")).toBe(true);
  });
});
