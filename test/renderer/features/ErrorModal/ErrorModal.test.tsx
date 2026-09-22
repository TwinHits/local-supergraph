import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ErrorModal from "@/renderer/features/ErrorModal";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

function diagnosis(key: ErrorKey, summary: string): Diagnosis {
  return {
    key,
    summary,
    cause: `${summary} cause`,
    resolution: [`${summary} fix`],
    raw: null,
    database: null,
    environment: null,
  };
}

function diagnosisWithRaw(key: ErrorKey, raw: string): Diagnosis {
  return { ...diagnosis(key, "Summary"), raw };
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
      subject="droids — develop"
      diagnoses={diagnoses}
      onClose={vi.fn()}
    />
  );
}

describe("stepping through more than one error, in priority order", () => {
  it("shows the highest-priority error first", () => {
    show(three);

    expect(screen.getByText("First")).toBeDefined();
  });

  it("back is disabled on the first error", () => {
    show(three);

    const back = screen.getByRole("button", { name: "Previous error" });

    expect(back.hasAttribute("disabled")).toBe(true);
  });

  it("next moves to the following error", async () => {
    show(three);

    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    expect(screen.getByText("Second")).toBeDefined();
  });

  it("back is enabled once past the first error", async () => {
    show(three);

    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    expect(
      screen
        .getByRole("button", { name: "Previous error" })
        .hasAttribute("disabled")
    ).toBe(false);
  });

  it("back returns to the error before", async () => {
    show(three);
    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Previous error" })
    );

    expect(screen.getByText("First")).toBeDefined();
  });

  it("next on the last error wraps to the first", async () => {
    show(three);
    await userEvent.click(screen.getByRole("button", { name: "Next error" }));
    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    expect(screen.getByText("First")).toBeDefined();
  });
});

describe("a single error needs no paging", () => {
  it("a single error shows no arrows", () => {
    show([three[0]]);

    expect(screen.queryByRole("button", { name: "Next error" })).toBeNull();
  });
});

describe("the raw output's More info toggle appears only when the error needs it explained further", () => {
  it("hides raw output behind a More info toggle for an ordinary error", () => {
    show([diagnosisWithRaw(ErrorKey.AwsSsoExpired, "raw detail")]);

    expect(screen.getByRole("button", { name: "More info" })).toBeDefined();
  });

  it("reveals raw output once More info is clicked", async () => {
    show([diagnosisWithRaw(ErrorKey.AwsSsoExpired, "raw detail")]);

    await userEvent.click(screen.getByRole("button", { name: "More info" }));

    expect(screen.getByText("raw detail")).toBeDefined();
  });

  it("shows raw output immediately for an unrecognized error, with no toggle to click", () => {
    show([diagnosisWithRaw(ErrorKey.Unknown, "raw detail")]);

    expect(screen.queryByRole("button", { name: "More info" })).toBeNull();
    expect(screen.getByText("raw detail")).toBeDefined();
  });

  it("shows raw output immediately for a profile that was never signed into, since it names the exact profile", () => {
    show([
      diagnosisWithRaw(
        ErrorKey.AwsProfileNotLoggedIn,
        "aws_profile: omfsvcshubdev"
      ),
    ]);

    expect(screen.queryByRole("button", { name: "More info" })).toBeNull();
    expect(screen.getByText("aws_profile: omfsvcshubdev")).toBeDefined();
  });
});
