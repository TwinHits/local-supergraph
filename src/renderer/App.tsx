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
          {activeTab === AppTab.Supergraph && <Supergraph />}
          {activeTab === AppTab.Databases && <Databases />}
        </div>
      </div>
    </div>
  );
}
