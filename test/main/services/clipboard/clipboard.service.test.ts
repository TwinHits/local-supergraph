import { beforeEach, describe, expect, it, vi } from "vitest";

/** A fresh module instance with no clipboard registered yet. */
async function freshClipboard() {
  return import("@/main/services/clipboard/clipboard.service");
}

beforeEach(function isolate() {
  vi.resetModules();
});

describe("the clipboard is injected, so it's safe to use before Electron supplies the real one", () => {
  it("copies nothing and reads nothing before a clipboard is registered", async () => {
    const { clipboard, readClipboard } = await freshClipboard();

    clipboard.copyText("cp databases.json.template databases.json");
    const actual = await readClipboard();

    expect(actual).toBe("");
  });
});

describe("text the renderer copies lands on the system clipboard", () => {
  it("writes the text through the registered writer", async () => {
    const { clipboard, registerClipboardWriter } = await freshClipboard();
    const writer = vi.fn();
    registerClipboardWriter(writer);

    clipboard.copyText("cp databases.json.template databases.json");

    expect(writer).toHaveBeenCalledWith(
      "cp databases.json.template databases.json"
    );
  });

  it("reads back what the registered reader says the clipboard holds", async () => {
    const { readClipboard, registerClipboardReader } = await freshClipboard();
    registerClipboardReader(function holding() {
      return Promise.resolve("s3cr3t");
    });

    const actual = await readClipboard();

    expect(actual).toBe("s3cr3t");
  });
});
