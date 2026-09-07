import { type WindowActions } from "@/main/services/window/window.types";
import { type WindowContract } from "@/shared/window/window.contract";

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
