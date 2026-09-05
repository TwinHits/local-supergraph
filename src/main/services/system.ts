import { type SystemContract } from "@/shared/system/system.contract";

/** Reports the runtime versions this Electron process is built on. */
export const system: SystemContract = {
  versions() {
    return {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    };
  },
};
