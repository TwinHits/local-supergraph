import { type ClipboardContract } from "@/shared/clipboard/clipboard.contract";

let writer: (text: string) => void = function noopWriter() {};
let reader: () => Promise<string> = function noopReader() {
  return Promise.resolve("");
};

/** Gives the service the system clipboard's writer. */
export function registerClipboardWriter(
  supplied: (text: string) => void
): void {
  writer = supplied;
}

/** Gives the service the system clipboard's reader. */
export function registerClipboardReader(supplied: () => Promise<string>): void {
  reader = supplied;
}

/** Puts text on the clipboard. */
export function writeClipboard(text: string): void {
  writer(text);
}

/** What the clipboard holds right now. */
export async function readClipboard(): Promise<string> {
  return reader();
}

export const clipboard: ClipboardContract = {
  copyText: writeClipboard,
};
