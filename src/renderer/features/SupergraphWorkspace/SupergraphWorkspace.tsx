import ErrorModal from "@/renderer/features/ErrorModal";
import SubgraphTable from "@/renderer/features/SubgraphTable";
import { useSubgraphErrors } from "@/renderer/features/SupergraphWorkspace/useSubgraphErrors";
import { useSubgraphs } from "@/renderer/features/SupergraphWorkspace/useSubgraphs";

type SupergraphWorkspaceProps = {
  routerPort: number;
};

/** Everything below the header: the subgraph table and the errors behind it. */
export default function SupergraphWorkspace({
  routerPort,
}: SupergraphWorkspaceProps) {
  const subgraphs = useSubgraphs(routerPort);
  const errors = useSubgraphErrors();

  return (
    <>
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
          subgraphs.setOverride(name, local, row?.port ?? null);
        }}
        onPortChange={function setPort(name, port) {
          subgraphs.setOverride(name, true, port);
        }}
        onShowErrors={function showErrors(name) {
          const row = subgraphs.rows.find(function named(each) {
            return each.name === name;
          });
          errors.show(name, row?.routingUrl ?? "");
        }}
      />
      <ErrorModal
        key={errors.shown.subgraph}
        open={errors.open}
        subgraph={errors.shown.subgraph}
        url={errors.shown.url}
        diagnoses={errors.shown.diagnoses}
        onCopy={function copy(command) {
          void navigator.clipboard.writeText(command);
        }}
        onRetry={subgraphs.reload}
        onClose={errors.close}
      />
    </>
  );
}
