import { beforeEach, describe, expect, it } from "vitest";

import {
  clearDatabaseConnectionFailure,
  clearSubgraphFailure,
  clearSupergraphFailure,
  errors,
  reportDatabaseConnectionFailure,
  reportSubgraphFailure,
  reportSupergraphFailure,
} from "@/main/services/errors/errors.service";
import { ErrorKey } from "@/shared/errors/errors.types";

/** Reads the keys off a list of diagnoses. */
function keysOf(diagnoses: { key: ErrorKey }[]): ErrorKey[] {
  return diagnoses.map(function key(each) {
    return each.key;
  });
}

beforeEach(function forgetEverything() {
  clearSupergraphFailure();
  clearSubgraphFailure("characters");
  clearDatabaseConnectionFailure();
});

describe("each subgraph tracks its own failures", () => {
  it("a subgraph nobody reported has nothing wrong with it", () => {
    expect(errors.subgraphErrors()["characters"] ?? []).toEqual([]);
  });

  it("a reported subgraph answers with its diagnosis", () => {
    reportSubgraphFailure(
      "characters",
      [ErrorKey.LocalRefused],
      "ECONNREFUSED"
    );

    expect(keysOf(errors.subgraphErrors()["characters"] ?? [])).toEqual([
      ErrorKey.LocalRefused,
    ]);
  });

  it("the text is read for signatures the caller did not name", () => {
    reportSubgraphFailure(
      "characters",
      [ErrorKey.LocalRefused],
      "The SSO session has expired"
    );

    expect(keysOf(errors.subgraphErrors()["characters"] ?? [])).toEqual([
      ErrorKey.AwsSsoExpired,
      ErrorKey.LocalRefused,
    ]);
  });

  it("a failure nothing recognizes is still an answer", () => {
    reportSubgraphFailure("characters", [], "it fell over");

    expect(keysOf(errors.subgraphErrors()["characters"] ?? [])).toEqual([
      ErrorKey.Unknown,
    ]);
  });

  it("clearing a subgraph forgets it", () => {
    reportSubgraphFailure("characters", [ErrorKey.LocalRefused], "");
    clearSubgraphFailure("characters");

    expect(errors.subgraphErrors()["characters"] ?? []).toEqual([]);
  });

  it("one subgraph's failure is not another's", () => {
    reportSubgraphFailure("characters", [ErrorKey.LocalRefused], "");

    expect(errors.subgraphErrors()["starships"] ?? []).toEqual([]);
  });
});

describe("the supergraph tracks its own failure, separate from subgraphs", () => {
  it("the supergraph reports separately from its subgraphs", () => {
    reportSupergraphFailure([ErrorKey.ApolloKeyInvalid], "401 Unauthorized");

    expect(keysOf(errors.supergraphErrors())).toEqual([
      ErrorKey.ApolloKeyInvalid,
    ]);
    expect(errors.subgraphErrors()["characters"] ?? []).toEqual([]);
  });

  it("a later report replaces the one before it", () => {
    reportSupergraphFailure([ErrorKey.ApolloKeyInvalid], "");
    reportSupergraphFailure([ErrorKey.GraphNotFound], "");

    expect(keysOf(errors.supergraphErrors())).toEqual([ErrorKey.GraphNotFound]);
  });

  it("every diagnosis carries copy for the screen", () => {
    reportSupergraphFailure([ErrorKey.RoverMissing], "ENOENT");

    const actual = errors.supergraphErrors()[0];

    expect(actual.summary).toBe("rover is not installed");
    expect(actual.resolution.length).toBeGreaterThan(0);
  });
});

describe("the database connection tracks its own failure, separate from the supergraph and subgraphs", () => {
  it("nothing reported yet has nothing wrong with it", () => {
    expect(errors.databaseConnectionErrors()).toEqual([]);
  });

  it("reports separately from the supergraph and subgraphs", () => {
    reportDatabaseConnectionFailure([ErrorKey.AwsSsoExpired], "");
    reportSupergraphFailure([ErrorKey.ApolloKeyInvalid], "");

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsSsoExpired,
    ]);
    expect(keysOf(errors.supergraphErrors())).toEqual([
      ErrorKey.ApolloKeyInvalid,
    ]);
  });

  it("a later report replaces the one before it", () => {
    reportDatabaseConnectionFailure([ErrorKey.AwsCliMissing], "");
    reportDatabaseConnectionFailure([ErrorKey.AwsSsoExpired], "");

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsSsoExpired,
    ]);
  });

  it("clearing forgets the last failure", () => {
    reportDatabaseConnectionFailure([ErrorKey.AwsSsoExpired], "");
    clearDatabaseConnectionFailure();

    expect(errors.databaseConnectionErrors()).toEqual([]);
  });

  it("the text is read for a signature the caller did not name explicitly", () => {
    reportDatabaseConnectionFailure([], "SessionManagerPlugin is not found.");

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.SessionManagerPluginMissing,
    ]);
  });
});
