import { expect, test } from "vitest";

import { findMatchingKeys } from "@/main/services/errors/errors.utils";
import { toFailureText } from "@/main/services/subgraph-health/subgraph-health.utils";
import { ErrorKey } from "@/shared/errors/errors.types";

/** What Node throws when nothing is listening on a port. */
const REFUSED = {
  message: "fetch failed",
  cause: {
    code: "ECONNREFUSED",
    message: "connect ECONNREFUSED 127.0.0.1:4002",
  },
};

test("keeps the code the signatures read", () => {
  const actual = toFailureText({
    message: "fetch failed",
    cause: {
      code: "ENOTFOUND",
      message: "getaddrinfo ENOTFOUND characters.svc",
    },
  });

  expect(findMatchingKeys(actual)).toEqual([ErrorKey.RemoteUnreachable]);
});

test("prefers the buried message to the generic one", () => {
  const actual = toFailureText(REFUSED);

  expect(actual).toBe("connect ECONNREFUSED 127.0.0.1:4002 ECONNREFUSED");
});

test("falls back to the outer message when nothing is buried", () => {
  const actual = toFailureText({ message: "The operation was aborted" });

  expect(actual).toBe("The operation was aborted");
});

test("something thrown that is not an error at all gives nothing back", () => {
  expect(toFailureText("boom")).toBeNull();
});
