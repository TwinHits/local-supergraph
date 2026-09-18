import { describe, expect, it } from "vitest";

import { sortDatabaseRowsByName } from "@/renderer/features/Databases/databases.utils";
import { type DatabaseRow } from "@/renderer/features/Databases/useDatabases";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";

function row(name: string): DatabaseRow {
  return {
    name,
    state: DatabaseConnectionState.Disconnected,
    localPort: 0,
  };
}

describe("the databases table sorts rows by name", () => {
  it("orders rows alphabetically", () => {
    const rows = [row("TEAM_MEMBER"), row("BILLING"), row("ANALYTICS")];

    const actual = sortDatabaseRowsByName(rows);

    expect(
      actual.map(function name(each) {
        return each.name;
      })
    ).toEqual(["ANALYTICS", "BILLING", "TEAM_MEMBER"]);
  });

  it("leaves the input rows alone", () => {
    const rows = [row("TEAM_MEMBER"), row("BILLING")];
    const before = rows.map(function name(each) {
      return each.name;
    });

    sortDatabaseRowsByName(rows);

    expect(
      rows.map(function name(each) {
        return each.name;
      })
    ).toEqual(before);
  });
});
