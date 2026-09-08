import ErrorModal from "@/renderer/features/ErrorModal";
import SubgraphTable from "@/renderer/features/SubgraphTable";
import SupergraphError from "@/renderer/features/SupergraphWorkspace/components/SupergraphError";
import styles from "@/renderer/features/SupergraphWorkspace/SupergraphWorkspace.module.scss";
import { buildErrorSubject } from "@/renderer/features/SupergraphWorkspace/supergraphWorkspace.utils";
import { useErrorModal } from "@/renderer/features/SupergraphWorkspace/useErrorModal";
import { useSubgraphs } from "@/renderer/features/SupergraphWorkspace/useSubgraphs";
import LoadingSpinner from "@/renderer/ui/LoadingSpinner";

const SUPERGRAPH_NAME = "Supergraph";

type SupergraphWorkspaceProps = {
  routerPort: number;
  variant: string;
};

/** Everything below the header. */
export default function SupergraphWorkspace({
  routerPort,
  variant,
}: SupergraphWorkspaceProps) {
  const subgraphs = useSubgraphs(routerPort);
  const modal = useErrorModal();

  if (subgraphs.loading) {
    return (
      <div className={styles.supergraphWorkspace__loading}>
        <LoadingSpinner label="Reading the graph" />
      </div>
    );
  }

  return (
    <>
      <SupergraphError
        diagnoses={subgraphs.supergraphErrors}
        onShowErrors={function showSupergraphErrors() {
          modal.show(
            buildErrorSubject(SUPERGRAPH_NAME, variant),
            subgraphs.supergraphErrors
          );
        }}
      />
      <SubgraphTable
        rows={subgraphs.rows}
        search={subgraphs.search}
        sort={subgraphs.sort}
        onSearchChange={subgraphs.setSearch}
        onSortChange={subgraphs.setSort}
        onLocalChange={function setLocal(name, local) {
          const row = subgraphs.rows.find(function named(each) {
            return each.name === name;
          });
          subgraphs.updateOverride(name, local, row?.port ?? null);
        }}
        onPortChange={function setPort(name, port) {
          subgraphs.updateOverride(name, true, port);
        }}
        onShowErrors={function showErrors(name) {
          modal.show(
            buildErrorSubject(name, variant),
            subgraphs.errors[name] ?? []
          );
        }}
        onRefresh={subgraphs.reload}
        refreshing={subgraphs.refreshing}
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
