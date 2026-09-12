import { describe, expect, it } from "vitest";

import {
  buildDiagnoses,
  findMatchingKeys,
} from "@/main/services/errors/errors.utils";
import { ErrorKey } from "@/shared/errors/errors.types";

const RAW = "Error: connect ECONNREFUSED 127.0.0.1:4001";

/** Reads the keys off a list of diagnoses. */
function keysOf(diagnoses: { key: ErrorKey }[]): ErrorKey[] {
  return diagnoses.map(function key(each) {
    return each.key;
  });
}

describe("diagnoses are ordered by priority, root cause first", () => {
  it("orders matches by authored priority, not by the order given", () => {
    const actual = buildDiagnoses(
      [ErrorKey.RemoteUnreachable, ErrorKey.AwsSsoExpired],
      RAW
    );

    expect(keysOf(actual)).toEqual([
      ErrorKey.AwsSsoExpired,
      ErrorKey.RemoteUnreachable,
    ]);
  });

  it("carries the raw text onto every diagnosis", () => {
    const actual = buildDiagnoses([ErrorKey.LocalRefused], RAW);

    expect(actual[0].raw).toBe(RAW);
  });

  it("no matches gives nothing", () => {
    expect(buildDiagnoses([], RAW)).toEqual([]);
  });
});

describe("matching failure text to known error signatures", () => {
  it("reads a stale sso session out of the text", () => {
    const actual = findMatchingKeys(
      "The SSO session associated with this profile has expired"
    );

    expect(actual).toEqual([ErrorKey.AwsSsoExpired]);
  });

  it("reads a held port out of the text", () => {
    const actual = findMatchingKeys(
      "listen EADDRINUSE: address already in use :::4001"
    );

    expect(actual).toEqual([ErrorKey.PortInUse]);
  });

  it("reads rover's rejected key code out of the text", () => {
    const actual = findMatchingKeys("E004: could not authenticate");

    expect(actual).toEqual([ErrorKey.ApolloKeyInvalid]);
  });

  it("no text at all matches nothing", () => {
    expect(findMatchingKeys(null)).toEqual([]);
  });

  it("text nothing recognizes matches nothing", () => {
    expect(findMatchingKeys("something went wrong")).toEqual([]);
  });

  it("one failure can match more than one signature", () => {
    const actual = findMatchingKeys(
      "ExpiredToken while binding, listen EADDRINUSE"
    );

    expect(actual).toEqual([ErrorKey.AwsSsoExpired, ErrorKey.PortInUse]);
  });
});
