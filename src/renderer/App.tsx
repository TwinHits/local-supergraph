import styles from "@/renderer/App.module.scss";
import Header from "@/renderer/features/Header";
import LaunchControl from "@/renderer/features/LaunchControl";
import { useLaunchControl } from "@/renderer/features/LaunchControl/useLaunchControl";
import SettingsModal from "@/renderer/features/SettingsModal";
import SupergraphWorkspace from "@/renderer/features/SupergraphWorkspace";
import { useGraph } from "@/renderer/hooks/useGraph";
import { useSettings } from "@/renderer/hooks/useSettings";

export default function App() {
  const graph = useGraph();
  const settings = useSettings();
  const launch = useLaunchControl();

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
          state={launch.state}
          onStart={launch.start}
          onStop={launch.stop}
        />
      </Header>
      <div className={styles.app__content}>
        <SupergraphWorkspace
          key={graph.variant}
          routerPort={settings.settings.routerPort}
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
