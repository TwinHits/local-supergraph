/** True once there is more than one error to step through (§4.4). */
export function hasArrows(count: number): boolean {
  return count > 1;
}

/** Back is dead on the first error and lights up once you are past it. */
export function canGoBack(index: number): boolean {
  return index > 0;
}

/** Next never disables: the last error wraps round to the first. */
export function nextIndex(index: number, count: number): number {
  if (count < 1) {
    return 0;
  }
  return (index + 1) % count;
}

/** Back only moves when it is allowed to, so it never wraps off the front. */
export function previousIndex(index: number): number {
  return canGoBack(index) ? index - 1 : index;
}

/** Where you are in the list, for the counter. */
export function position(index: number, count: number): string {
  return `${index + 1} of ${count}`;
}
