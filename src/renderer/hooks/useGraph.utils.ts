/** The variant to fall back to when the persisted choice isn't offered anymore. */
export function reconcileVariant(
  offered: string[],
  current: string
): string | null {
  if (offered.length === 0 || offered.includes(current)) {
    return null;
  }
  return offered[0];
}
