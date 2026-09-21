import { beforeEach, describe, expect, it } from "vitest";

import {
  addDatabaseError,
  addSubgraphError,
  addSupergraphError,
  clearDatabaseError,
  clearSubgraphError,
  clearSupergraphError,
  errors,
} from "@/main/services/errors/errors.service";
import { ErrorKey } from "@/shared/errors/errors.types";

const DEV = "dev";
const PROD = "prod";

/** Reads the keys off a list of diagnoses. */
function keysOf(diagnoses: { key: ErrorKey }[]): ErrorKey[] {
  return diagnoses.map(function key(each) {
    return each.key;
  });
}

beforeEach(function forgetEverything() {
  clearSupergraphError();
  clearSubgraphError("characters");
  clearDatabaseError("TEAM_MEMBER", DEV);
  clearDatabaseError("TEAM_MEMBER", PROD);
});

describe("each subgraph tracks its own failures", () => {
  it("a subgraph nobody reported has nothing wrong with it", () => {
    expect(errors.subgraphErrors()["characters"] ?? []).toEqual([]);
  });

  it("a reported subgraph answers with its diagnosis", () => {
    addSubgraphError("characters", [ErrorKey.LocalRefused], "ECONNREFUSED");

    expect(keysOf(errors.subgraphErrors()["characters"] ?? [])).toEqual([
      ErrorKey.LocalRefused,
    ]);
  });

  it("the text is read for signatures the caller did not name", () => {
    addSubgraphError(
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
    addSubgraphError("characters", [], "it fell over");

    expect(keysOf(errors.subgraphErrors()["characters"] ?? [])).toEqual([
      ErrorKey.Unknown,
    ]);
  });

  it("clearing a subgraph forgets it", () => {
    addSubgraphError("characters", [ErrorKey.LocalRefused], "");
    clearSubgraphError("characters");

    expect(errors.subgraphErrors()["characters"] ?? []).toEqual([]);
  });

  it("one subgraph's failure is not another's", () => {
    addSubgraphError("characters", [ErrorKey.LocalRefused], "");

    expect(errors.subgraphErrors()["starships"] ?? []).toEqual([]);
  });
});

describe("the supergraph tracks its own failure, separate from subgraphs", () => {
  it("the supergraph reports separately from its subgraphs", () => {
    addSupergraphError([ErrorKey.ApolloKeyInvalid], "401 Unauthorized");

    expect(keysOf(errors.supergraphErrors())).toEqual([
      ErrorKey.ApolloKeyInvalid,
    ]);
    expect(errors.subgraphErrors()["characters"] ?? []).toEqual([]);
  });

  it("a later report replaces the one before it", () => {
    addSupergraphError([ErrorKey.ApolloKeyInvalid], "");
    addSupergraphError([ErrorKey.GraphNotFound], "");

    expect(keysOf(errors.supergraphErrors())).toEqual([ErrorKey.GraphNotFound]);
  });

  it("every diagnosis carries copy for the screen", () => {
    addSupergraphError([ErrorKey.RoverMissing], "ENOENT");

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
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsSsoExpired], "");
    addSupergraphError([ErrorKey.ApolloKeyInvalid], "");

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsSsoExpired,
    ]);
    expect(keysOf(errors.supergraphErrors())).toEqual([
      ErrorKey.ApolloKeyInvalid,
    ]);
  });

  it("a later report for the same (database, environment) pick replaces the one before it", () => {
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsCliMissing], "");
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsSsoExpired], "");

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsSsoExpired,
    ]);
  });

  it("one database's failure is not another's", () => {
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsSsoExpired], "");

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsSsoExpired,
    ]);

    clearDatabaseError("OTHER_DATABASE", DEV);

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsSsoExpired,
    ]);
  });

  it("clearing forgets the last failure", () => {
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsSsoExpired], "");
    clearDatabaseError("TEAM_MEMBER", DEV);

    expect(errors.databaseConnectionErrors()).toEqual([]);
  });

  it("the text is read for a signature the caller did not name explicitly", () => {
    addDatabaseError(
      "TEAM_MEMBER",
      DEV,
      [],
      "SessionManagerPlugin is not found."
    );

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.SessionManagerPluginMissing,
    ]);
  });
});

describe("a database's failure is scoped by environment as well as name", () => {
  it("a failure under one environment does not show under another", () => {
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsSsoExpired], "");

    const prodDiagnoses = errors
      .databaseConnectionErrors()
      .filter(function isProd(diagnosis) {
        return diagnosis.environment === PROD;
      });

    expect(prodDiagnoses).toEqual([]);
  });

  it("clearing one environment's failure leaves the other environment's alone", () => {
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsSsoExpired], "");
    addDatabaseError("TEAM_MEMBER", PROD, [ErrorKey.AwsCliMissing], "");

    clearDatabaseError("TEAM_MEMBER", DEV);

    expect(keysOf(errors.databaseConnectionErrors())).toEqual([
      ErrorKey.AwsCliMissing,
    ]);
  });

  it("carries the environment the attempt was made under on each diagnosis", () => {
    addDatabaseError("TEAM_MEMBER", PROD, [ErrorKey.AwsSsoExpired], "");

    expect(errors.databaseConnectionErrors()[0]?.environment).toBe(PROD);
  });
});

describe("a database connection diagnosis can be traced back to which database it's about", () => {
  it("carries the database that was reported on each of its diagnoses", () => {
    addDatabaseError("TEAM_MEMBER", DEV, [ErrorKey.AwsSsoExpired], "");

    expect(errors.databaseConnectionErrors()[0]?.database).toBe("TEAM_MEMBER");
  });

  it("does not attach a database to a subgraph or supergraph diagnosis", () => {
    addSubgraphError("characters", [ErrorKey.LocalRefused], "");
    addSupergraphError([ErrorKey.ApolloKeyInvalid], "");

    expect(errors.subgraphErrors()["characters"]?.[0]?.database).toBeNull();
    expect(errors.supergraphErrors()[0]?.database).toBeNull();
  });

  it("does not attach an environment to a subgraph or supergraph diagnosis", () => {
    addSubgraphError("characters", [ErrorKey.LocalRefused], "");
    addSupergraphError([ErrorKey.ApolloKeyInvalid], "");

    expect(errors.subgraphErrors()["characters"]?.[0]?.environment).toBeNull();
    expect(errors.supergraphErrors()[0]?.environment).toBeNull();
  });
});
