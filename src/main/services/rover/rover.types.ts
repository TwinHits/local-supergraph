/** What rover wrote, and whether it was there to write anything. */
export type RoverResult = {
  stdout: string;
  stderr: string;
  found: boolean;
};

/** The parts of a failed execFile we read. */
export type ExecFailure = {
  stdout?: string;
  stderr?: string;
  code?: string;
};
