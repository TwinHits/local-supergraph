import styles from "@/renderer/App.module.scss";
import Header from "@/renderer/features/Header";
import { useLaunchControl } from "@/renderer/features/LaunchControl/useLaunchControl";
import SettingsModal from "@/renderer/features/SettingsModal";
import SupergraphWorkspace from "@/renderer/features/SupergraphWorkspace";
import { useSubgraphs } from "@/renderer/features/SupergraphWorkspace/useSubgraphs";
import Toolbar from "@/renderer/features/Toolbar";
import { useGraph } from "@/renderer/hooks/useGraph";
import { useSettings } from "@/renderer/hooks/useSettings";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

export default function App() {
  const graph = useGraph();
  const settings = useSettings();
  const launch = useLaunchControl();
  const subgraphs = useSubgraphs(
    settings.settings.routerPort,
    launch.state !== SupergraphState.Stopped,
    graph.variant
  );

  return (
    <div className={styles.app}>
      <Header />
      <Toolbar
        graphName={graph.graphName}
        variant={graph.variant}
        variants={graph.variants}
        search={subgraphs.search}
        launchState={launch.state}
        refreshing={subgraphs.refreshing}
        onVariantChange={graph.select}
        onSearchChange={subgraphs.setSearch}
        onLaunchStart={launch.start}
        onLaunchStop={launch.stop}
        onRefresh={subgraphs.reload}
        onOpenSettings={settings.show}
      />
      <div className={styles.app__content}>
        <SupergraphWorkspace
          loading={subgraphs.loading}
          rows={subgraphs.rows}
          sort={subgraphs.sort}
          errors={subgraphs.errors}
          supergraphErrors={subgraphs.supergraphErrors}
          supergraphState={launch.state}
          onSortChange={subgraphs.setSort}
          onLocalChange={subgraphs.updateOverride}
          onEnabledChange={subgraphs.updateEnabled}
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
