/** What the renderer may put on the clipboard. */
export type ClipboardContract = {
  copyText(text: string): void;
};
