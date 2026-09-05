import { type SystemVersions } from "@/shared/system/system.types";

/** What the renderer may ask about the running process. */
export type SystemContract = {
  versions(): SystemVersions;
};
