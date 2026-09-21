import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AwsSsoLoginAction from "@/renderer/features/Databases/components/AwsSsoLoginAction";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

const SSO_EXPIRED: Diagnosis = {
  key: ErrorKey.AwsSsoExpired,
  summary: "AWS credentials are stale",
  cause: "Your SSO session expired.",
  resolution: ["Sign in again"],
  raw: null,
  database: "TEAM_MEMBER",
  environment: "dev",
};

const CLI_MISSING: Diagnosis = {
  key: ErrorKey.AwsCliMissing,
  summary: "The aws CLI is not installed",
  cause: "aws isn't installed, or isn't on your PATH.",
  resolution: [
    "Install the AWS CLI, then reopen the app so it picks up your PATH",
  ],
  raw: null,
  database: "TEAM_MEMBER",
  environment: "dev",
};

describe("a stale AWS session offers to sign in", () => {
  it("shows a Login button for a stale-credentials diagnosis", () => {
    render(<AwsSsoLoginAction diagnosis={SSO_EXPIRED} onLogin={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Login" })).toBeDefined();
  });

  it("renders nothing for a failure that isn't a stale AWS session", () => {
    const { container } = render(
      <AwsSsoLoginAction diagnosis={CLI_MISSING} onLogin={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("passes the diagnosis to the handler when clicked", async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<AwsSsoLoginAction diagnosis={SSO_EXPIRED} onLogin={onLogin} />);

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(onLogin).toHaveBeenCalledWith(SSO_EXPIRED);
  });

  it("disables the button while sign-in is pending", async () => {
    let resolveLogin: (succeeded: boolean) => void = () => {};
    const onLogin = vi.fn(
      () =>
        new Promise<boolean>(function pending(resolve) {
          resolveLogin = resolve;
        })
    );
    render(<AwsSsoLoginAction diagnosis={SSO_EXPIRED} onLogin={onLogin} />);

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(
      screen
        .getByRole("button", { name: "Signing in…" })
        .hasAttribute("disabled")
    ).toBe(true);

    await act(async () => {
      resolveLogin(true);
      await Promise.resolve();
    });
  });

  it("re-enables the button if sign-in rejects", async () => {
    let rejectLogin: (error: unknown) => void = () => {};
    const onLogin = vi.fn(
      () =>
        new Promise<boolean>(function pending(_resolve, reject) {
          rejectLogin = reject;
        })
    );
    render(<AwsSsoLoginAction diagnosis={SSO_EXPIRED} onLogin={onLogin} />);

    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    await act(async () => {
      rejectLogin(new Error("aws sso login failed"));
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", { name: "Login" }).hasAttribute("disabled")
    ).toBe(false);
  });
});
