/** The window buttons the app draws itself. */
export type WindowContract = {
  minimize(): void;
  toggleMaximize(): boolean;
  close(): void;
  isMaximized(): boolean;
};
