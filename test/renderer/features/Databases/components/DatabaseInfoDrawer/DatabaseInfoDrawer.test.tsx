import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DatabaseInfoDrawer from "@/renderer/features/Databases/components/DatabaseInfoDrawer";
import iconButtonStyles from "@/renderer/ui/IconButton/IconButton.module.scss";

const INFO = {
  host: "team-member.example.rds.amazonaws.com",
  port: 5432,
  localPort: 5432,
  databaseName: "team_member",
  username: "app_user",
};

describe("the two copy buttons get an equal hover and tooltip area, regardless of their label's length", () => {
  it("does not stretch either copy button to match its own field's width", () => {
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
