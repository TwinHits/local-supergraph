import { describe, expect, it } from "vitest";

import {
  buildDatabaseRowReason,
  errorsForDatabase,
  sharedDatabaseErrors,
  sortDatabaseRowsByName,
} from "@/renderer/features/Databases/databases.utils";
import { type DatabaseRow } from "@/renderer/features/Databases/useDatabases";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

function row(name: string): DatabaseRow {
  return {
    name,
    state: DatabaseConnectionState.Disconnected,
    localPort: 0,
  };
}

function diagnosis(overrides: Partial<Diagnosis>): Diagnosis {
  return {
    key: ErrorKey.Unknown,
    summary: "Something is wrong",
    cause: "Unspecified.",
    resolution: [],
    raw: null,
    database: null,
    environment: null,
    ...overrides,
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

describe("a table-wide banner only shows shared, AWS-setup errors", () => {
  it("keeps a shared diagnosis", () => {
    const shared = diagnosis({ key: ErrorKey.AwsSsoExpired });

    expect(sharedDatabaseErrors([shared])).toEqual([shared]);
  });

  it("drops a row-specific diagnosis", () => {
    const rowSpecific = diagnosis({ key: ErrorKey.DatabaseEntryMissing });

    expect(sharedDatabaseErrors([rowSpecific])).toEqual([]);
  });
});

describe("a row's own errors are found by its database name, regardless of scope", () => {
  it("keeps only the diagnoses about that database", () => {
    const forTeamMember = diagnosis({ database: "TEAM_MEMBER" });
    const forOther = diagnosis({ database: "OTHER_MEMBER" });

    expect(errorsForDatabase([forTeamMember, forOther], "TEAM_MEMBER")).toEqual(
      [forTeamMember]
    );
  });

  it("keeps a row-specific diagnosis too, not just shared ones", () => {
    const rowSpecific = diagnosis({ database: "TEAM_MEMBER" });

    expect(errorsForDatabase([rowSpecific], "TEAM_MEMBER")).toEqual([
      rowSpecific,
    ]);
  });
});

describe("a row's status light explains itself from its own top error", () => {
  it("uses the first diagnosis's summary", () => {
    const top = diagnosis({ summary: "AWS credentials are stale" });
    const second = diagnosis({ summary: "Something else" });

    expect(buildDatabaseRowReason([top, second])).toBe(
      "AWS credentials are stale"
    );
  });

  it("is null when the row has no current error", () => {
    expect(buildDatabaseRowReason([])).toBeNull();
  });
});
