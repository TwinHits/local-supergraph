import { useState } from "react";

import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import styles from "@/renderer/ui/TabRail/TabRail.module.scss";
import { type TabRailItem } from "@/renderer/ui/TabRail/TabRail.types";

type TabRailProps = {
  items: TabRailItem[];
  activeId: string;
  onChange: (id: string) => void;
};

/** A vertical strip of tabs, collapsible to icons only. */
export default function TabRail({ items, activeId, onChange }: TabRailProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={[styles.tabRail, collapsed ? styles["tabRail--collapsed"] : ""]
        .join(" ")
        .trim()}
    >
      <div className={styles.tabRail__toggle}>
        <IconButton
          label={collapsed ? "Expand tabs" : "Collapse tabs"}
          tooltip={collapsed ? "Expand" : "Collapse"}
          variant={IconButtonVariant.Muted}
          stretch
          onClick={function toggle() {
            setCollapsed(function flip(current) {
              return !current;
            });
          }}
        >
          <span className={styles.tabRail__toggleIcon}>
            <IconGlyph
              name={collapsed ? IconName.ExpandRail : IconName.CollapseRail}
              size={IconSize.ExtraLarge}
            />
          </span>
        </IconButton>
      </div>
      {items.map(function toItem(item) {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            className={[
              styles.tabRail__item,
              active ? styles["tabRail__item--active"] : "",
            ]
              .join(" ")
              .trim()}
            onClick={function select() {
              onChange(item.id);
            }}
          >
            <span className={styles.tabRail__icon}>
              <IconGlyph name={item.icon} size={IconSize.Medium} />
            </span>
            {!collapsed && (
              <span className={styles.tabRail__label}>{item.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
