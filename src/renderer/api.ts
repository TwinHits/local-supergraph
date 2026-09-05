/* v8 ignore file -- the one file tests replace; it names the bridge, nothing more */
import { type Contract, type Promised } from "@/shared/contract/contract.types";

declare global {
  interface Window {
    bridge: Promised<Contract>;
  }
}

/** Every call main answers, as plain async methods. The only route out of the renderer. */
export const api: Promised<Contract> = window.bridge;
