import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DatabaseInfoDrawer from "@/renderer/features/Databases/components/DatabaseInfoDrawer";
import styles from "@/renderer/features/Databases/components/DatabaseInfoDrawer/DatabaseInfoDrawer.module.scss";
import iconButtonStyles from "@/renderer/ui/IconButton/IconButton.module.scss";

const INFO = {
  host: "team-member.example.rds.amazonaws.com",
  port: 5432,
  localPort: 5432,
  databaseName: "team_member",
  username: "app_user",
};

describe("the two copy buttons size to their own icon, not whatever their row stretches to", () => {
  it("does not stretch either copy button", () => {
    render(
      <DatabaseInfoDrawer
        name="TEAM_MEMBER"
        expanded
        info={INFO}
        columnCount={5}
        onCopyPassword={vi.fn()}
        onCopyPasswordUrlEncoded={vi.fn()}
      />
    );

    const copyPassword = screen.getByRole("button", {
      name: "Copy TEAM_MEMBER's password",
    });
    const copyUrlEncoded = screen.getByRole("button", {
      name: "Copy TEAM_MEMBER's password, URL-encoded",
    });

    expect(
      copyPassword.parentElement?.classList.contains(
        iconButtonStyles["iconButton--stretch"]
      )
    ).toBe(false);
    expect(
      copyUrlEncoded.parentElement?.classList.contains(
        iconButtonStyles["iconButton--stretch"]
      )
    ).toBe(false);
  });
});

describe("the two ways to copy the password share a single field", () => {
  it("has no separate label for the URL-encoded copy action", () => {
    render(
      <DatabaseInfoDrawer
        name="TEAM_MEMBER"
        expanded
        info={INFO}
        columnCount={5}
        onCopyPassword={vi.fn()}
        onCopyPasswordUrlEncoded={vi.fn()}
      />
    );

    expect(screen.queryByText("Password (URL-encoded)")).toBeNull();
  });

  it("puts both copy buttons under the same Password field", () => {
    render(
      <DatabaseInfoDrawer
        name="TEAM_MEMBER"
        expanded
        info={INFO}
        columnCount={5}
        onCopyPassword={vi.fn()}
        onCopyPasswordUrlEncoded={vi.fn()}
      />
    );

    const field = screen
      .getByText("Password")
      .closest(`.${styles.databaseInfoDrawer__field}`);
    const copyPassword = screen.getByRole("button", {
      name: "Copy TEAM_MEMBER's password",
    });
    const copyUrlEncoded = screen.getByRole("button", {
      name: "Copy TEAM_MEMBER's password, URL-encoded",
    });

    expect(field?.contains(copyPassword)).toBe(true);
    expect(field?.contains(copyUrlEncoded)).toBe(true);
  });
});
