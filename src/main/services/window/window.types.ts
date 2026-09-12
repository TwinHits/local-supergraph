export type WindowActions = {
  minimize(): void;
  toggleMaximize(): boolean;
  close(): void;
  isMaximized(): boolean;
  openExternal(url: string): void;
};
