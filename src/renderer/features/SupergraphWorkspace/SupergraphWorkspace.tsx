import ErrorModal from "@/renderer/features/ErrorModal";
import { useErrorModal } from "@/renderer/features/ErrorModal/useErrorModal";
import SubgraphTable from "@/renderer/features/SubgraphTable";
import styles from "@/renderer/features/SupergraphWorkspace/SupergraphWorkspace.module.scss";
import ErrorBanner from "@/renderer/ui/ErrorBanner";
import LoadingSpinner from "@/renderer/ui/LoadingSpinner";
import {
  type Diagnosis,
  type SubgraphErrorMap,
} from "@/shared/errors/errors.types";
import { type Row, SortColumn } from "@/shared/subgraph/subgraph.types";
import { SupergraphState } from "@/shared/supergraph/supergraph.types";

const SUPERGRAPH_NAME = "Supergraph";

type SupergraphWorkspaceProps = {
  loading: boolean;
  rows: Row[];
  sort: SortColumn;
  errors: SubgraphErrorMap;
  supergraphErrors: Diagnosis[];
  supergraphState: SupergraphState;
  onSortChange: (column: SortColumn) => void;
  onLocalChange: (name: string, local: boolean, port: number | null) => void;
  onEnabledChange: (name: string, enabled: boolean) => void;
};

/** Everything below the toolbar. */
export default function SupergraphWorkspace({
  loading,
  rows,
  sort,
  errors,
  supergraphErrors,
  supergraphState,
  onSortChange,
  onLocalChange,
  onEnabledChange,
}: SupergraphWorkspaceProps) {
  const modal = useErrorModal();

  if (loading) {
    return (
      <div className={styles.supergraphWorkspace__loading}>
        <LoadingSpinner label="Reading the graph" />
      </div>
    );
  }

  return (
    <>
      <ErrorBanner
        diagnoses={supergraphErrors}
        onClick={function showSupergraphErrors() {
          modal.show(SUPERGRAPH_NAME, supergraphErrors);
        }}
      />
      <SubgraphTable
        rows={rows}
        sort={sort}
        supergraphRunning={supergraphState === SupergraphState.Running}
        onSortChange={onSortChange}
        onLocalChange={function setLocal(name, local) {
          const row = rows.find(function named(each) {
            return each.name === name;
          });
          onLocalChange(name, local, row?.port ?? null);
        }}
        onPortChange={function setPort(name, port) {
          onLocalChange(name, true, port);
        }}
        onEnabledChange={onEnabledChange}
        onShowErrors={function showErrors(name) {
          modal.show(name, errors[name] ?? []);
        }}
      />
      <ErrorModal
        key={modal.shown.subject}
        open={modal.open}
        subject={modal.shown.subject}
        diagnoses={modal.shown.diagnoses}
        onClose={modal.close}
      />
    </>
  );
}
