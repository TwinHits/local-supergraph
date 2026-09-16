/** What to run for every AWS CLI invocation. */
export const AWS_COMMAND = "aws";

/** Node's error code for a command it could not find. */
export const NOT_FOUND_CODE = "ENOENT";

/** The SSM document that turns a session into a local port forward. */
export const SSM_DOCUMENT_NAME = "AWS-StartPortForwardingSessionToRemoteHost";

/** Set on the child so the session routes through the bastion, matching the reference script. */
export const BASTION_ENV_VAR = "USE_BASTION";

/** How long to wait after SIGTERM before sending SIGKILL. */
export const SHUTDOWN_GRACE_MS = 5000;
