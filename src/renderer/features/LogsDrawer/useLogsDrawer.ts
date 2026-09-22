import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/renderer/api";
import { LogsDrawerState } from "@/renderer/features/LogsDrawer/LogsDrawer.types";
import { nextStateAfterStart } from "@/renderer/features/LogsDrawer/LogsDrawer.utils";
import { type LogCursor, type LogSourceId } from "@/shared/logs/logs.types";

const READ_POLL_MS = 500;

/** Drives one log source's drawer visibility state and its polled content. */
export function useLogsDrawer(sourceId: LogSourceId) {
  const [state, setState] = useState(LogsDrawerState.Hidden);
  const [lines, setLines] = useState<string[]>([]);
  const cursor = useRef<LogCursor>(null);
  const visible = state !== LogsDrawerState.Hidden;

  useEffect(
    function pollLog() {
      if (!visible) {
        return undefined;
      }
      const interval = setInterval(function read() {
        void api.logs
          .read(sourceId, cursor.current)
          .then(function apply(chunk) {
            cursor.current = chunk.cursor;
            if (chunk.lines.length === 0 && !chunk.reset) {
              return;
            }
            setLines(function append(current) {
              const base = chunk.reset ? [] : current;
              return [
                ...base,
                ...chunk.lines.map(function toText(line) {
                  return line.text;
                }),
              ];
            });
          });
      }, READ_POLL_MS);
      return function stop() {
        clearInterval(interval);
      };
    },
    [visible, sourceId]
  );

  const notifyStarted = useCallback(function openOnStart() {
    setState(nextStateAfterStart);
  }, []);

  const minimize = useCallback(function minimizeDrawer() {
    setState(LogsDrawerState.Minimized);
  }, []);

  const maximize = useCallback(function maximizeDrawer() {
    setState(LogsDrawerState.Maximized);
  }, []);

  const restore = useCallback(function restoreDrawer() {
    setState(LogsDrawerState.Open);
  }, []);

  const clear = useCallback(function clearLines() {
    setLines([]);
  }, []);

  return { state, lines, notifyStarted, minimize, maximize, restore, clear };
}
