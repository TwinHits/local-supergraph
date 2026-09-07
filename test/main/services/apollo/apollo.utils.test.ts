import { expect, test } from "vitest";

import { parseSubgraphList } from "@/main/services/apollo/apollo.utils";
import { ApolloFailure } from "@/shared/apollo/apollo.types";

const LISTING = JSON.stringify({
  json_version: "1",
  data: {
    subgraphs: [
      { name: "planets", url: "http://localhost:4003/" },
      { name: "characters", url: "http://localhost:4001/" },
    ],
    success: true,
  },
  error: null,
});

const BAD_KEY = JSON.stringify({
  json_version: "1",
  data: { success: false },
  error: {
    message: "HTTP status client error (401 Unauthorized) for url (...)",
    code: "E004",
  },
});

test("reads the registered subgraphs", () => {
  const actual = parseSubgraphList(LISTING);

  expect(actual.subgraphs).toEqual([
    { name: "planets", routingUrl: "http://localhost:4003/" },
    { name: "characters", routingUrl: "http://localhost:4001/" },
  ]);
});

test("a listing has no failure", () => {
  const actual = parseSubgraphList(LISTING);

  expect(actual.failure).toBe(ApolloFailure.None);
});

test("names a rejected key by its code, not its wording", () => {
  const actual = parseSubgraphList(BAD_KEY);

  expect(actual.failure).toBe(ApolloFailure.InvalidKey);
});

test("keeps rover's message for a failure", () => {
  const actual = parseSubgraphList(BAD_KEY);

  expect(actual.message).toContain("401 Unauthorized");
});

test("an unrecognised code is an unknown failure", () => {
  const actual = parseSubgraphList(
    JSON.stringify({
      data: { success: false },
      error: { code: "E999", message: "boom" },
    })
  );

  expect(actual.failure).toBe(ApolloFailure.Unknown);
});

test("output that is not JSON is an unknown failure", () => {
  const actual = parseSubgraphList("rover fell over");

  expect(actual.failure).toBe(ApolloFailure.Unknown);
});

test("a listing with no subgraphs is still a listing", () => {
  const actual = parseSubgraphList(
    JSON.stringify({ data: { subgraphs: [], success: true }, error: null })
  );

  expect(actual).toEqual({
    subgraphs: [],
    failure: ApolloFailure.None,
    message: "",
  });
});
