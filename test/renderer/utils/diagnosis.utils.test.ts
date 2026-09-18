import { describe, expect, it } from "vitest";

import { buildDiagnosisMessage } from "@/renderer/utils/diagnosis.utils";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";

const KEY_REJECTED: Diagnosis = {
  key: ErrorKey.ApolloKeyInvalid,
  summary: "Apollo rejected the key",
  cause: "APOLLO_KEY is invalid or has expired.",
  resolution: ["Regenerate the key"],
  raw: "401 Unauthorized",
  database: null,
};

describe("a diagnosis reads as one line: its summary and its cause", () => {
  it("a failure reads as its summary and its cause", () => {
    const actual = buildDiagnosisMessage(KEY_REJECTED);

    expect(actual).toBe(
      "Apollo rejected the key: APOLLO_KEY is invalid or has expired."
    );
  });
});
