import { useState } from "react";

import styles from "@/renderer/App.module.scss";
import Header from "@/renderer/features/Header";
import LaunchControl, { RouterState } from "@/renderer/features/LaunchControl";
import SettingsModal from "@/renderer/features/SettingsModal";
import SupergraphWorkspace from "@/renderer/features/SupergraphWorkspace";
import { useGraph } from "@/renderer/hooks/useGraph";
import { useSettings } from "@/renderer/hooks/useSettings";

export default function App() {
  const graph = useGraph();
  const settings = useSettings();
  const [router, setRouter] = useState(RouterState.Stopped);

  return (
    <div className={styles.app}>
      <Header
        graphName={graph.graphName}
        variant={graph.variant}
        variants={graph.variants}
        onVariantChange={graph.select}
        onOpenSettings={settings.show}
      >
        <LaunchControl
          state={router}
          onStart={function start() {
            setRouter(RouterState.Running);
          }}
          onStop={function stop() {
            setRouter(RouterState.Stopped);
          }}
        />
      </Header>
      <div className={styles.app__content}>
        <SupergraphWorkspace
          key={graph.variant}
          routerPort={settings.settings.routerPort}
          variant={graph.variant}
        />
      </div>
      <SettingsModal
        open={settings.open}
        settings={settings.settings}
        onChange={settings.change}
        onClose={settings.close}
      />
    </div>
  );
}
