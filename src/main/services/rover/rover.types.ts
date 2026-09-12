/** Rover's output and whether rover was found. */
export type RoverResult = {
  stdout: string;
  stderr: string;
  found: boolean;
};

/** The parts of a failed execFile the service reads. */
export type ExecFailure = {
  stdout?: string;
  stderr?: string;
  code?: string;
};

/** One subgraph rover should compose, and the URL it answers at. */
export type ConfigEntry = {
  name: string;
  url: string;
};
