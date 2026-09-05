/* v8 ignore file -- the one file tests replace; it only forwards to preload */
import { type SystemVersions } from "@/models";

type SystemBridge = {
  versions(): Promise<SystemVersions>;
};

declare global {
  interface Window {
    system: SystemBridge;
  }
}

/** Reads the runtime versions from the main process. */
export function systemVersions(): Promise<SystemVersions> {
  return window.system.versions();
}
