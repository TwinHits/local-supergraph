import { expect, test } from "vitest";

import { diagnosesFor } from "@/main/services/errors/errors.service";
import { ErrorKey } from "@/shared/errors/errors.types";

const RAW = "Error: connect ECONNREFUSED 127.0.0.1:4001";

/** Reads the keys off a list of diagnoses. */
function keysOf(diagnoses: { key: ErrorKey }[]): ErrorKey[] {
  return diagnoses.map(function key(each) {
    return each.key;
  });
}

test("orders matches by authored priority, not by the order given", () => {
  const actual = diagnosesFor(
    [ErrorKey.RemoteUnreachable, ErrorKey.AwsSsoExpired],
    RAW
  );

  expect(keysOf(actual)).toEqual([
    ErrorKey.AwsSsoExpired,
    ErrorKey.RemoteUnreachable,
  ]);
});

test("carries the raw text onto every diagnosis", () => {
  const actual = diagnosesFor([ErrorKey.LocalRefused], RAW);

  expect(actual[0].raw).toBe(RAW);
});

test("no matches gives nothing", () => {
  expect(diagnosesFor([], RAW)).toEqual([]);
});
