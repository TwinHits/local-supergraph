/** Reads the error code out of the fetch failure Node throws. */
export function toFailureText(failure: unknown): string | null {
  const thrown = failure as {
    message?: string;
    cause?: { code?: string; message?: string };
  };
  const code = thrown.cause?.code ?? "";
  const message = thrown.cause?.message ?? thrown.message ?? "";
  const reason = `${message} ${code}`.trim();
  return reason === "" ? null : reason;
}
