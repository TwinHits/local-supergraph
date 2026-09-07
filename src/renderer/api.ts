/* v8 ignore file -- tests replace this file instead of the bridge */
import { type Contract, type Promised } from "@/shared/contract/contract.types";

declare global {
  interface Window {
    bridge: Promised<Contract>;
  }
}

/** The only route from the renderer to main. */
export const api: Promised<Contract> = window.bridge;
