import { useState } from "react";

import styles from "@/renderer/App.module.scss";
import Header from "@/renderer/features/Header";
import LaunchControl, { RouterState } from "@/renderer/features/LaunchControl";
import SettingsModal from "@/renderer/features/SettingsModal";
import SupergraphWorkspace from "@/renderer/features/SupergraphWorkspace";
import { useSettings } from "@/renderer/hooks/useSettings";

const GRAPH_NAME = "local-supergraph";
const VARIANTS = ["current", "staging"];

export default function App() {
  const settings = useSettings();
  const [variant, setVariant] = useState(VARIANTS[0]);
  const [router, setRouter] = useState(RouterState.Stopped);

  return (
    <div className={styles.app}>
      <Header
        graphName={GRAPH_NAME}
        variant={variant}
        variants={VARIANTS}
        onVariantChange={setVariant}
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
      <SupergraphWorkspace routerPort={settings.settings.routerPort} />
      <SettingsModal
        open={settings.open}
        settings={settings.settings}
        onChange={settings.change}
        onClose={settings.close}
      />
    </div>
  );
}
