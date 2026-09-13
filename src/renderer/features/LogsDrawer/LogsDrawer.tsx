import { useEffect, useRef, useState } from "react";

import styles from "@/renderer/features/LogsDrawer/LogsDrawer.module.scss";
import { LogsDrawerState } from "@/renderer/features/LogsDrawer/LogsDrawer.types";
import { isAtBottom } from "@/renderer/features/LogsDrawer/LogsDrawer.utils";
import { type useLogsDrawer } from "@/renderer/features/LogsDrawer/useLogsDrawer";
import Drawer from "@/renderer/ui/Drawer";
import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";

type LogsDrawerProps = {
  drawer: ReturnType<typeof useLogsDrawer>;
};

/** The rover log viewer: hidden until launch, then minimized/open/maximized. */
export default function LogsDrawer({ drawer }: LogsDrawerProps) {
  const { state, lines, minimize, maximize, restore, clear } = drawer;
  const linesRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);

  useEffect(
    function scrollToNewest() {
      if (!following || linesRef.current === null) {
        return;
      }
      linesRef.current.scrollTop = linesRef.current.scrollHeight;
    },
    [lines, following]
  );

  if (state === LogsDrawerState.Hidden) {
    return null;
  }

  if (state === LogsDrawerState.Minimized) {
    return (
      <div className={styles.logsDrawer__bar}>
        <span className={styles.logsDrawer__title}>Logs</span>
        <span className={styles.logsDrawer__controls}>
          <IconButton
            label="Restore logs"
            tooltip="Restore"
            variant={IconButtonVariant.Muted}
            onClick={restore}
          >
            <IconGlyph name={IconName.Restore} />
          </IconButton>
          <IconButton
            label="Maximize logs"
            tooltip="Maximize"
            variant={IconButtonVariant.Muted}
            onClick={maximize}
          >
            <IconGlyph name={IconName.Maximize} />
          </IconButton>
        </span>
      </div>
    );
  }

  const maximized = state === LogsDrawerState.Maximized;
  const paperClass = [
    styles.logsDrawer__paper,
    maximized ? styles["logsDrawer__paper--maximized"] : "",
  ]
    .join(" ")
    .trim();

  return (
    <Drawer open paperClassName={paperClass}>
      <div className={styles.logsDrawer__header}>
        <span className={styles.logsDrawer__controls}>
          <IconButton
            label="Clear logs"
            tooltip="Clear"
            variant={IconButtonVariant.Muted}
            onClick={clear}
          >
            <IconGlyph name={IconName.Clear} />
          </IconButton>
          <IconButton
            label="Minimize logs"
            tooltip="Minimize"
            variant={IconButtonVariant.Muted}
            onClick={minimize}
          >
            <IconGlyph name={IconName.Minimize} />
          </IconButton>
          <IconButton
            label={maximized ? "Restore logs" : "Maximize logs"}
            tooltip={maximized ? "Restore" : "Maximize"}
            variant={IconButtonVariant.Muted}
            onClick={maximized ? restore : maximize}
          >
            <IconGlyph
              name={maximized ? IconName.Restore : IconName.Maximize}
            />
          </IconButton>
        </span>
      </div>
      <div
        className={styles.logsDrawer__lines}
        ref={linesRef}
        onScroll={function checkFollowing() {
          if (linesRef.current === null) {
            return;
          }
          const { scrollTop, scrollHeight, clientHeight } = linesRef.current;
          setFollowing(isAtBottom(scrollTop, scrollHeight, clientHeight));
        }}
      >
        {lines.map(function toLine(line, index) {
          return (
            <div key={index} className={styles.logsDrawer__line}>
              {line}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
