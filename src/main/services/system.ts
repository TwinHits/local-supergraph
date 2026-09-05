import { type SystemVersions } from "@/models";

/** Reports the runtime versions this Electron process is built on. */
export function systemVersions(): SystemVersions {
  return {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  };
}
