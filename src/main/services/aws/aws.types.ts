/** One aws CLI invocation's output, and whether the binary was found at all. */
export type AwsExecResult = {
  stdout: string;
  stderr: string;
  found: boolean;
  succeeded: boolean;
};

/** The parts of a failed execFile the service reads. */
export type ExecFailure = {
  stdout?: string;
  stderr?: string;
  code?: string;
};

/** What a port-forwarding session needs to open. */
export type PortForwardParams = {
  target: string;
  host: string;
  port: number;
  localPort: number;
  profile: string;
};

/** Whether the session started, and why it didn't if it failed to spawn at all. */
export type PortForwardStartResult = {
  started: boolean;
  found: boolean;
  error: string | null;
};

/** A secret's resolved password, and whether the binary was found at all. */
export type SecretResult = {
  password: string | null;
  found: boolean;
};
