import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import ErrorModal from "@/renderer/features/ErrorModal";
import { ErrorKey, type Diagnosis } from "@/shared/errors/errors.types";

function diagnosis(key: ErrorKey, summary: string): Diagnosis {
  return {
    key,
    summary,
    cause: `${summary} cause`,
    resolution: [`${summary} fix`],
    command: null,
    raw: "",
  };
}

const three = [
  diagnosis(ErrorKey.AwsSsoExpired, "First"),
  diagnosis(ErrorKey.LocalRefused, "Second"),
  diagnosis(ErrorKey.RemoteUnreachable, "Third"),
];

function show(diagnoses: Diagnosis[]) {
  render(
    <ErrorModal
      open
      subgraph="droids"
      url="https://droids.svc/graphql"
      diagnoses={diagnoses}
      onCopy={vi.fn()}
      onRetry={vi.fn()}
      onClose={vi.fn()}
    />
  );
}

test("shows the highest-priority error first", () => {
  show(three);

  expect(screen.getByText("First")).toBeDefined();
});

test("counts the errors", () => {
  show(three);

  expect(screen.getByText("1 of 3")).toBeDefined();
});

test("back is disabled on the first error", () => {
  show(three);

  const back = screen.getByRole("button", { name: "Previous error" });

  expect(back.hasAttribute("disabled")).toBe(true);
});

test("next moves to the following error", async () => {
  show(three);

  await userEvent.click(screen.getByRole("button", { name: "Next error" }));

  expect(screen.getByText("Second")).toBeDefined();
});

test("back is enabled once past the first error", async () => {
  show(three);

  await userEvent.click(screen.getByRole("button", { name: "Next error" }));

  expect(
    screen
      .getByRole("button", { name: "Previous error" })
      .hasAttribute("disabled")
  ).toBe(false);
});

test("back returns to the error before", async () => {
  show(three);
  await userEvent.click(screen.getByRole("button", { name: "Next error" }));

  await userEvent.click(screen.getByRole("button", { name: "Previous error" }));

  expect(screen.getByText("First")).toBeDefined();
});

test("next on the last error wraps to the first", async () => {
  show(three);
  await userEvent.click(screen.getByRole("button", { name: "Next error" }));
  await userEvent.click(screen.getByRole("button", { name: "Next error" }));

  await userEvent.click(screen.getByRole("button", { name: "Next error" }));

  expect(screen.getByText("1 of 3")).toBeDefined();
});

test("a single error shows no arrows and no counter", () => {
  show([three[0]]);

  expect(screen.queryByRole("button", { name: "Next error" })).toBeNull();
  expect(screen.queryByText("1 of 1")).toBeNull();
});
