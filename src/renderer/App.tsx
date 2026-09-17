import { useState } from "react";

import styles from "@/renderer/App.module.scss";
import Databases from "@/renderer/features/Databases";
import Header from "@/renderer/features/Header";
import Supergraph from "@/renderer/features/Supergraph";
import { IconName } from "@/renderer/ui/IconGlyph";
import TabRail, { type TabRailItem } from "@/renderer/ui/TabRail";

enum AppTab {
  Supergraph = "supergraph",
  Databases = "databases",
}

const TAB_ITEMS: TabRailItem[] = [
  { id: AppTab.Supergraph, icon: IconName.Supergraph, label: "Supergraph" },
  { id: AppTab.Databases, icon: IconName.Database, label: "Databases" },
];

/**
 * Classes for a tab's wrapper: visible when active, hidden (not unmounted)
 * otherwise — so switching tabs doesn't reset a feature's own state (the
 * Supergraph table's loading state, in particular) back to its first render.
 */
function tabClasses(active: boolean): string {
  return [styles.app__body__tab, active ? "" : styles["app__body__tab--hidden"]]
    .join(" ")
    .trim();
}

export default function App() {
  const [activeTab, setActiveTab] = useState(AppTab.Supergraph);

  return (
    <div className={styles.app}>
      <Header />
      <div className={styles.app__body}>
        <TabRail
          items={TAB_ITEMS}
          activeId={activeTab}
          onChange={function changeTab(id) {
            setActiveTab(id as AppTab);
          }}
        />
        <div className={styles.app__body__main}>
          <div className={tabClasses(activeTab === AppTab.Supergraph)}>
            <Supergraph />
          </div>
          <div className={tabClasses(activeTab === AppTab.Databases)}>
            <Databases />
          </div>
        </div>
      </div>
    </div>
  );
}
