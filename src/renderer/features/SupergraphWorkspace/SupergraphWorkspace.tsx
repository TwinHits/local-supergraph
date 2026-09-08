import ErrorModal from "@/renderer/features/ErrorModal";
import SubgraphTable from "@/renderer/features/SubgraphTable";
import SupergraphError from "@/renderer/features/SupergraphWorkspace/components/SupergraphError";
import styles from "@/renderer/features/SupergraphWorkspace/SupergraphWorkspace.module.scss";
import { useErrorModal } from "@/renderer/features/SupergraphWorkspace/useErrorModal";
import { useSubgraphs } from "@/renderer/features/SupergraphWorkspace/useSubgraphs";
import LoadingSpinner from "@/renderer/ui/LoadingSpinner";

const SUPERGRAPH_TITLE = "Supergraph";

type SupergraphWorkspaceProps = {
  routerPort: number;
};

/** Everything below the header. */
export default function SupergraphWorkspace({
  routerPort,
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
          modal.show(SUPERGRAPH_TITLE, subgraphs.supergraphErrors);
        }}
      />
      <SubgraphTable
        rows={subgraphs.rows}
        search={subgraphs.search}
        sort={subgraphs.sort}
        portErrors={subgraphs.portErrors}
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
          const row = subgraphs.rows.find(function named(each) {
            return each.name === name;
          });
          modal.show(
            `${name} — ${row?.routingUrl ?? ""}`,
            subgraphs.errors[name] ?? []
          );
        }}
      />
      <ErrorModal
        key={modal.shown.title}
        open={modal.open}
        title={modal.shown.title}
        diagnoses={modal.shown.diagnoses}
        onClose={modal.close}
      />
    </>
  );
}
