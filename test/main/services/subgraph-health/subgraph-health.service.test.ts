import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearSubgraphFailure,
  errors,
} from "@/main/services/errors/errors.service";
import { checkSubgraphs } from "@/main/services/subgraph-health/subgraph-health.service";
import { ErrorKey } from "@/shared/errors/errors.types";
import { Reachability } from "@/shared/subgraph/subgraph.types";

const answer = vi.fn();
vi.stubGlobal("fetch", answer);

const SUBGRAPHS = [
  { name: "characters", routingUrl: "https://characters.svc/graphql" },
  { name: "starships", routingUrl: "https://starships.svc/graphql" },
];

/** Answers every request like a working GraphQL server. */
function alwaysAnswers(): void {
  answer.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { __typename: "Query" } }),
  });
}

/** Fails every request the way Node fails a dead connection. */
function neverAnswers(code: string, message: string): void {
  answer.mockRejectedValue({
    message: "fetch failed",
    cause: { code, message },
  });
}

beforeEach(function forgetEverything() {
  answer.mockReset();
  clearSubgraphFailure("characters");
  clearSubgraphFailure("starships");
});

describe("checking a subgraph sends a real graphql query, not just a ping", () => {
  it("a subgraph that answers is reachable", async () => {
    alwaysAnswers();

    const actual = await checkSubgraphs(SUBGRAPHS, {});

    expect(actual).toEqual({
      characters: Reachability.Reachable,
      starships: Reachability.Reachable,
    });
  });

  it("a subgraph that does not answer is unreachable", async () => {
    neverAnswers("ENOTFOUND", "getaddrinfo ENOTFOUND characters.svc");

    const actual = await checkSubgraphs(SUBGRAPHS, {});

    expect(actual.characters).toBe(Reachability.Unreachable);
  });
});

describe("a local override is checked at its own port, not the registry url", () => {
  it("a local subgraph is asked at its own port, not at its routing url", async () => {
    alwaysAnswers();

    await checkSubgraphs(SUBGRAPHS, { starships: { local: true, port: 4002 } });

    expect(answer.mock.calls[1][0]).toBe("http://localhost:4002");
  });

  it("a local subgraph with no port yet has nothing to ask", async () => {
    alwaysAnswers();

    const actual = await checkSubgraphs(SUBGRAPHS, {
      starships: { local: true, port: null },
    });

    expect(actual.starships).toBe(Reachability.Unknown);
    expect(answer).toHaveBeenCalledTimes(1);
  });
});

describe("a failed check is filed under the right cause", () => {
  it("a silent local port files a refused connection", async () => {
    neverAnswers("ECONNREFUSED", "connect ECONNREFUSED 127.0.0.1:4002");

    await checkSubgraphs(SUBGRAPHS, { starships: { local: true, port: 4002 } });

    expect(errors.subgraphErrors()["starships"][0].key).toBe(
      ErrorKey.LocalRefused
    );
  });

  it("a silent deployed url files an unreachable remote", async () => {
    neverAnswers("ENOTFOUND", "getaddrinfo ENOTFOUND characters.svc");

    await checkSubgraphs(SUBGRAPHS, {});

    expect(errors.subgraphErrors()["characters"][0].key).toBe(
      ErrorKey.RemoteUnreachable
    );
  });

  it("answering again forgets the last failure", async () => {
    neverAnswers("ECONNREFUSED", "connect ECONNREFUSED 127.0.0.1:4001");
    await checkSubgraphs(SUBGRAPHS, {});
    alwaysAnswers();

    await checkSubgraphs(SUBGRAPHS, {});

    expect(errors.subgraphErrors()["characters"]).toBeUndefined();
  });
});
