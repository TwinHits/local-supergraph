import styles from "@/renderer/App.module.scss";
import Header from "@/renderer/features/Header";
import { useLaunchControl } from "@/renderer/features/LaunchControl/useLaunchControl";
import LogsDrawer, {
  LogsDrawerState,
  useLogsDrawer,
} from "@/renderer/features/LogsDrawer";
import SettingsModal from "@/renderer/features/SettingsModal";
import SupergraphWorkspace from "@/renderer/features/SupergraphWorkspace";
import { useSubgraphs } from "@/renderer/features/SupergraphWorkspace/useSubgraphs";
import Toolbar from "@/renderer/features/Toolbar";
import { useGraph } from "@/renderer/hooks/useGraph";
import { useSettings } from "@/renderer/hooks/useSettings";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

const LOGS_DRAWER_CONTENT_CLASSES: Record<LogsDrawerState, string> = {
  [LogsDrawerState.Hidden]: "",
  [LogsDrawerState.Minimized]: styles["app__content--withMinimizedLogs"],
  [LogsDrawerState.Open]: styles["app__content--withOpenLogs"],
  [LogsDrawerState.Maximized]: styles["app__content--withMaximizedLogs"],
};

export default function App() {
  const graph = useGraph();
  const settings = useSettings();
  const launch = useLaunchControl();
  const logsDrawer = useLogsDrawer();
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
        onLaunchStart={function startSupergraph() {
          launch.start();
          logsDrawer.notifyLaunched();
        }}
        onLaunchStop={launch.stop}
        onOpenRouter={launch.openRouter}
        onRefresh={subgraphs.reload}
        onOpenSettings={settings.show}
      />
      <div
        className={[
          styles.app__content,
          LOGS_DRAWER_CONTENT_CLASSES[logsDrawer.state],
        ]
          .join(" ")
          .trim()}
      >
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
      <LogsDrawer drawer={logsDrawer} />
      <SettingsModal
        open={settings.open}
        settings={settings.settings}
        variantFilter={settings.variantFilter}
        allVariants={settings.allVariants}
        onChange={settings.change}
        onVariantFilterChange={settings.changeVariantFilter}
        onClose={function closeSettings() {
          settings.close();
          graph.reload();
        }}
      />
    </div>
  );
}
