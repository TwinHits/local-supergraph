import { beforeEach, describe, expect, it } from "vitest";

import {
  clearSubgraphFailure,
  clearSupergraphFailure,
  errors,
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
