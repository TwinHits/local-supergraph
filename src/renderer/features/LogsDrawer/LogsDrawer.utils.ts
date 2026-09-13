import { LogsDrawerState } from "@/renderer/features/LogsDrawer/LogsDrawer.types";

const FOLLOW_THRESHOLD_PX = 4;

/** The drawer's state right after the supergraph launches: Hidden opens, anything else stays put. */
export function nextStateAfterLaunch(
  current: LogsDrawerState
): LogsDrawerState {
  return current === LogsDrawerState.Hidden ? LogsDrawerState.Open : current;
}

/** Whether a scroll position is close enough to the bottom to keep following new lines. */
export function isAtBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): boolean {
  return scrollHeight - clientHeight - scrollTop <= FOLLOW_THRESHOLD_PX;
}
