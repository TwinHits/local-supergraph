import { type WindowContract } from "@/shared/window/window.contract";

/** What the Electron layer supplies, since only it may hold a BrowserWindow. */
export type WindowActions = {
  minimize(): void;
  toggleMaximize(): boolean;
  close(): void;
  isMaximized(): boolean;
};

let actions: WindowActions | null = null;

export function registerWindowActions(supplied: WindowActions): void {
  actions = supplied;
}

export const windowControls: WindowContract = {
  minimize() {
    if (actions !== null) {
      actions.minimize();
    }
  },
  toggleMaximize() {
    if (actions === null) {
      return false;
    }
    return actions.toggleMaximize();
  },
  close() {
    if (actions !== null) {
      actions.close();
    }
  },
  isMaximized() {
    if (actions === null) {
      return false;
    }
    return actions.isMaximized();
  },
};
