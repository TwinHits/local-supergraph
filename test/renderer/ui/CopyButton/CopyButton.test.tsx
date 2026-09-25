import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import CopyButton from "@/renderer/ui/CopyButton";
import { IconName } from "@/renderer/ui/IconGlyph";

afterEach(function restoreRealTimers() {
  vi.useRealTimers();
});

describe("a copy action spins while pending, then confirms or reverts", () => {
  it("disables the button while the copy is in flight", async () => {
    let resolveCopy: (value: boolean) => void = () => {};
    const onCopy = vi.fn(
      () =>
        new Promise<boolean>(function pending(resolve) {
          resolveCopy = resolve;
        })
    );
    render(
      <CopyButton
        icon={IconName.Copy}
        label="Copy the password"
        tooltip="Copy password"
        onCopy={onCopy}
      />
    );

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);

    await act(async () => {
      resolveCopy(true);
      await Promise.resolve();
    });
  });

  it("reverts to idle, not stuck loading, when the copy rejects", async () => {
    let rejectCopy: (error: unknown) => void = () => {};
    const onCopy = vi.fn(
      () =>
        new Promise<boolean>(function pending(_resolve, reject) {
          rejectCopy = reject;
        })
    );
    render(
      <CopyButton
        icon={IconName.Copy}
        label="Copy the password"
        tooltip="Copy password"
        onCopy={onCopy}
      />
    );

    await userEvent.click(screen.getByRole("button"));
    await act(async () => {
      rejectCopy(new Error("clipboard write failed"));
      await Promise.resolve();
    });

    await waitFor(function reverted() {
      expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
    });
  });
});
