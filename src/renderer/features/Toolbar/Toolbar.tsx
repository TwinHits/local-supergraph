import LaunchControl from "@/renderer/features/LaunchControl";
import RefreshButton from "@/renderer/features/SubgraphTable/components/RefreshButton";
import styles from "@/renderer/features/Toolbar/Toolbar.module.scss";
import DropdownSelect from "@/renderer/ui/DropdownSelect";
import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName } from "@/renderer/ui/IconGlyph";
import SearchField from "@/renderer/ui/SearchField";
import TextLabel from "@/renderer/ui/TextLabel";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

type ToolbarProps = {
  graphName: string;
  variant: string;
  variants: string[];
  search: string;
  launchState: SupergraphState;
  refreshing: boolean;
  onVariantChange: (variant: string) => void;
  onSearchChange: (search: string) => void;
  onLaunchStart: () => void;
  onLaunchStop: () => void;
  onOpenRouter: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
};

/** The row of graph identity and controls beneath the title bar. */
export default function Toolbar({
  graphName,
  variant,
  variants,
  search,
  launchState,
  refreshing,
  onVariantChange,
  onSearchChange,
  onLaunchStart,
  onLaunchStop,
  onOpenRouter,
  onRefresh,
  onOpenSettings,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.toolbar__identity}>
        <TextLabel>{graphName}@</TextLabel>
        <span className={styles.toolbar__variant}>
          <DropdownSelect
            value={variant}
            label="Variant"
            options={variants}
            onChange={onVariantChange}
          />
        </span>
        <SearchField value={search} onChange={onSearchChange} />
        <RefreshButton refreshing={refreshing} onClick={onRefresh} />
      </span>
      <span className={styles.toolbar__actions}>
        <LaunchControl
          state={launchState}
          onStart={onLaunchStart}
          onStop={onLaunchStop}
        />
        <IconButton
          label="Open router in browser"
          tooltip="Open Local"
          disabled={launchState !== SupergraphState.Running}
          onClick={onOpenRouter}
        >
          <IconGlyph name={IconName.OpenLink} />
        </IconButton>
        <IconButton
          label="Settings"
          tooltip="Settings"
          onClick={onOpenSettings}
        >
          <IconGlyph name={IconName.Settings} />
        </IconButton>
      </span>
    </div>
  );
}
