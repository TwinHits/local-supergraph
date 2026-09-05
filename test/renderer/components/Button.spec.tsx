import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import Button from "@/renderer/components/Button";

test("shows its label", () => {
  const expected = "Start Supergraph";

  render(<Button onClick={vi.fn()}>{expected}</Button>);

  expect(screen.getByRole("button").textContent).toBe(expected);
});

test("reports a click", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Retry</Button>);

  await userEvent.click(screen.getByRole("button"));

  expect(onClick).toHaveBeenCalledOnce();
});

// user-event refuses to click a disabled button, the same way a browser does,
// so the requirement is expressed as the state that blocks the click.
test("is disabled when told to be", () => {
  render(
    <Button onClick={vi.fn()} disabled>
      Retry
    </Button>
  );

  const actual = screen.getByRole("button");

  expect(actual.hasAttribute("disabled")).toBe(true);
});
