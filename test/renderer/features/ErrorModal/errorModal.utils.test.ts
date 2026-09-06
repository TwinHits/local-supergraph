import { expect, test } from "vitest";

import {
  canGoBack,
  hasArrows,
  nextIndex,
  position,
  previousIndex,
} from "@/renderer/features/ErrorModal/errorModal.utils";

test("one error shows no arrows", () => {
  expect(hasArrows(1)).toBe(false);
});

test("two errors show arrows", () => {
  expect(hasArrows(2)).toBe(true);
});

test("back is disabled on the first error", () => {
  expect(canGoBack(0)).toBe(false);
});

test("back is enabled once past the first error", () => {
  expect(canGoBack(1)).toBe(true);
});

test("next steps forward", () => {
  expect(nextIndex(0, 4)).toBe(1);
});

test("next wraps from the last error to the first", () => {
  expect(nextIndex(3, 4)).toBe(0);
});

test("back steps backward", () => {
  expect(previousIndex(2)).toBe(1);
});

test("back stays put on the first error", () => {
  expect(previousIndex(0)).toBe(0);
});

test("the counter reads one-based", () => {
  expect(position(1, 4)).toBe("2 of 4");
});
