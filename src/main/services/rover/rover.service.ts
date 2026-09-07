import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

import { environment } from "@/main/services/environment/environment.service";
import {
  INSTALLED_PATH,
  NOT_FOUND_CODE,
  PATH_COMMAND,
} from "@/main/services/rover/rover.constants";
import {
  type ExecFailure,
  type RoverResult,
} from "@/main/services/rover/rover.types";

const run = promisify(execFile);

/**
 * Looks in rover's install path first, because its installer only updates PATH
 * for shells opened afterward.
 */
export function findRover(): string {
  for (const candidate of [INSTALLED_PATH, `${INSTALLED_PATH}.exe`]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return PATH_COMMAND;
}

/** Runs rover and returns its output. */
export async function runRover(args: string[]): Promise<RoverResult> {
  try {
    const result = await run(findRover(), args, {
      env: environment.childEnv(),
    });
    return { stdout: result.stdout, stderr: result.stderr, found: true };
  } catch (failure) {
    const exit = failure as ExecFailure;
    if (exit.code === NOT_FOUND_CODE) {
      return { stdout: "", stderr: "", found: false };
    }
    return {
      stdout: exit.stdout ?? "",
      stderr: exit.stderr ?? "",
      found: true,
    };
  }
}
