import { test, expect } from "vitest";
import { systemVersions } from "@/main/services/system";

test("reports the versions the process is running on", () => {
  const expected = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  };

  const actual = systemVersions();

  expect(actual).toEqual(expected);
});
