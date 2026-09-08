/** True once there is more than one thing to step through. */
export function hasArrows(count: number): boolean {
  return count > 1;
}

/** False on the first one, true once you are past it. */
export function canGoBack(index: number): boolean {
  return index > 0;
}

/** The next index, wrapping from the last one back to the first. */
export function getNextIndex(index: number, count: number): number {
  if (count < 1) {
    return 0;
  }
  return (index + 1) % count;
}

/** The previous index, stopping at the first one rather than wrapping. */
export function getPreviousIndex(index: number): number {
  return canGoBack(index) ? index - 1 : index;
}
