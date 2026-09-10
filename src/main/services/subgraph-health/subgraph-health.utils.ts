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

/**
 * True when a parsed body has the shape of a GraphQL response. A subgraph
 * behind a VPN gateway or the wrong URL can still answer HTTP requests —
 * with a login page, a 404, whatever — without answering as GraphQL at all.
 */
export function looksLikeGraphQL(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    ("data" in body || "errors" in body)
  );
}
