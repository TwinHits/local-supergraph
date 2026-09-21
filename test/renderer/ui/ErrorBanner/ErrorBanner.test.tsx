import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ErrorBanner from "@/renderer/ui/ErrorBanner";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

const FIRST: Diagnosis = {
  key: ErrorKey.ApolloKeyInvalid,
  summary: "Apollo rejected the key",
  cause: "APOLLO_KEY is invalid or has expired.",
  resolution: ["Regenerate the key"],
  raw: "401 Unauthorized",
  database: null,
  environment: null,
};

const SECOND: Diagnosis = {
  key: ErrorKey.GraphNotFound,
  summary: "The key cannot see that graph",
  cause: "The graph or variant does not exist.",
  resolution: ["Check the variant"],
  raw: null,
  database: null,
  environment: null,
};

describe("with no failures, nothing renders", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(<ErrorBanner diagnoses={[]} />);

    expect(container.firstChild).toBeNull();
  });
});

describe("a single failure shows its summary and cause, with no pager", () => {
  it("shows the summary and cause as one line", () => {
    render(<ErrorBanner diagnoses={[FIRST]} />);

    expect(
      screen.getByText(
        "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
      )
    ).toBeDefined();
  });

  it("offers no pager when there is only one failure", () => {
    render(<ErrorBanner diagnoses={[FIRST]} />);

    expect(screen.queryByRole("button", { name: "Next error" })).toBeNull();
  });
});

describe("more than one failure can be stepped through", () => {
  it("starts on the first failure and steps to the next", async () => {
    render(<ErrorBanner diagnoses={[FIRST, SECOND]} />);
    expect(
      screen.getByText(
        "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
      )
    ).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    expect(
      screen.getByText(
        "The key cannot see that graph: The graph or variant does not exist."
      )
    ).toBeDefined();
  });
});

describe("clicking the banner is optional", () => {
  it("reports a click when a handler is given", async () => {
    const onClick = vi.fn();
    render(<ErrorBanner diagnoses={[FIRST]} onClick={onClick} />);

    await userEvent.click(
      screen.getByText(
        "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
      )
    );

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders without a handler and stays inert to clicks", async () => {
    render(<ErrorBanner diagnoses={[FIRST]} />);

    await userEvent.click(
      screen.getByText(
        "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
      )
    );

    expect(
      screen.getByText(
        "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
      )
    ).toBeDefined();
  });
});

describe("the caller can offer its own action for the failure currently shown", () => {
  it("renders nothing extra when no renderActions is given", () => {
    render(<ErrorBanner diagnoses={[FIRST]} />);

    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("renders whatever the caller returns for the diagnosis currently shown", () => {
    render(
      <ErrorBanner
        diagnoses={[FIRST]}
        renderActions={function renderRetry() {
          return <button type="button">Retry</button>;
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("passes the diagnosis currently shown, not just the first one, to the caller", async () => {
    const renderActions = vi.fn(function label(diagnosis: Diagnosis) {
      return <span>{diagnosis.summary}</span>;
    });
    render(
      <ErrorBanner diagnoses={[FIRST, SECOND]} renderActions={renderActions} />
    );
    expect(renderActions).toHaveBeenLastCalledWith(FIRST);

    await userEvent.click(screen.getByRole("button", { name: "Next error" }));

    expect(renderActions).toHaveBeenLastCalledWith(SECOND);
  });
});
