import { expect, test } from "vitest";

import { parseSubgraphList } from "@/main/services/apollo/apollo.utils";
import { ErrorKey } from "@/shared/errors/errors.types";

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

test("a listing has not failed", () => {
  const actual = parseSubgraphList(LISTING);

  expect(actual.failed).toBe(false);
});

test("names a rejected key by its code, not its wording", () => {
  const actual = parseSubgraphList(BAD_KEY);

  expect(actual.keys).toEqual([ErrorKey.ApolloKeyInvalid]);
});

test("keeps rover's message for a failure", () => {
  const actual = parseSubgraphList(BAD_KEY);

  expect(actual.raw).toContain("401 Unauthorized");
});

test("an unrecognised code names no signature, and leaves the text to say why", () => {
  const actual = parseSubgraphList(
    JSON.stringify({
      data: { success: false },
      error: { code: "E999", message: "boom" },
    })
  );

  expect(actual.failed).toBe(true);
  expect(actual.keys).toEqual([]);
  expect(actual.raw).toBe("boom");
});

test("output that is not JSON is a failure carrying whatever rover wrote", () => {
  const actual = parseSubgraphList("rover fell over");

  expect(actual.failed).toBe(true);
  expect(actual.raw).toBe("rover fell over");
});

test("a listing with no subgraphs is still a listing", () => {
  const actual = parseSubgraphList(
    JSON.stringify({ data: { subgraphs: [], success: true }, error: null })
  );

  expect(actual).toEqual({
    subgraphs: [],
    failed: false,
    keys: [],
    raw: null,
  });
});
