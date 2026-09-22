import { useState } from "react";

import styles from "@/renderer/features/SubgraphTable/components/RefreshButton/RefreshButton.module.scss";
import IconButton from "@/renderer/ui/IconButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";

type RefreshButtonProps = {
  refreshing: boolean;
  onClick: () => void;
};

/** Re-checks supergraph and subgraph errors, spinning until refreshing ends. */
export default function RefreshButton({
  refreshing,
  onClick,
}: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(refreshing);
  const [trackedRefreshing, setTrackedRefreshing] = useState(refreshing);

  if (refreshing !== trackedRefreshing) {
    setTrackedRefreshing(refreshing);
    if (refreshing) {
      setSpinning(true);
    }
  }

  return (
    <IconButton
      label="Refresh subgraphs"
      tooltip="Refetch Subgraphs"
      stretch
      onClick={onClick}
    >
      <span
        className={
          spinning
            ? styles["refreshButton__icon--spinning"]
            : styles.refreshButton__icon
        }
        onAnimationIteration={function completeSpin() {
          if (!refreshing) {
            setSpinning(false);
          }
        }}
      >
        <IconGlyph name={IconName.Refresh} size={IconSize.Large} />
      </span>
    </IconButton>
  );
}
