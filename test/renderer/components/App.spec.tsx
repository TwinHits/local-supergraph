import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "@/renderer/components/App";

const versions = { electron: "44.0.0", chrome: "140.0.0", node: "22.0.0" };

vi.mock("@/renderer/api", function stubBridge() {
  return {
    api: {
      system: {
        versions() {
          return Promise.resolve(versions);
        },
      },
    },
  };
});

test("renders hello world", () => {
  const { getByText } = render(<App />);

  expect(getByText("Hello, World")).toBeDefined();
});

test("shows the versions main reported", async () => {
  render(<App />);

  const actual = await screen.findByText(versions.electron);

  expect(actual).toBeDefined();
});
