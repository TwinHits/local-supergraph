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
 * Rover's own installer only updates PATH for shells opened afterward, so a
 * developer who just installed it fails a PATH-only check.
 */
export function findRover(): string {
  for (const candidate of [INSTALLED_PATH, `${INSTALLED_PATH}.exe`]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return PATH_COMMAND;
}

/**
 * Runs rover and hands back its streams. The only module that spawns it, and it
 * never blocks: rover takes about a minute to fail on a rejected key.
 */
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
