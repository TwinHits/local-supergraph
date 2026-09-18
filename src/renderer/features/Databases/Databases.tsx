import AwsSsoLoginAction from "@/renderer/features/Databases/components/AwsSsoLoginAction";
import DatabaseRow from "@/renderer/features/Databases/components/DatabaseRow";
import styles from "@/renderer/features/Databases/Databases.module.scss";
import { useDatabases } from "@/renderer/features/Databases/useDatabases";
import DataTable, { type Column } from "@/renderer/ui/DataTable";
import DropdownSelect from "@/renderer/ui/DropdownSelect";
import ErrorBanner from "@/renderer/ui/ErrorBanner";

const NO_SORT = "";

const COLUMNS: Column[] = [
  { key: "status", label: "Status", sortable: false },
  { key: "name", label: "Name", sortable: false },
  { key: "localPort", label: "Local port", sortable: false },
  { key: "connection", label: "", sortable: false },
  { key: "copyPassword", label: "", sortable: false },
  { key: "copyPasswordUrlEncoded", label: "", sortable: false },
];

/** Connects to RDS databases over SSM port-forwarding sessions. */
export default function Databases() {
  const databases = useDatabases();

  return (
    <>
      <div className={styles.databases__toolbar}>
        <DropdownSelect
          value={databases.environment}
          label="Environment"
          options={databases.environments}
          onChange={databases.selectEnvironment}
        />
      </div>
      <div className={styles.databases__content}>
        {databases.errors.length > 0 && (
          <ErrorBanner
            diagnoses={databases.errors}
            renderActions={function renderLogin(diagnosis) {
              return (
                <AwsSsoLoginAction
                  key={diagnosis.database ?? diagnosis.summary}
                  diagnosis={diagnosis}
                  onLogin={databases.login}
                />
              );
            }}
          />
        )}
        <DataTable
          columns={COLUMNS}
          sortKey={NO_SORT}
          onSort={function noop() {}}
        >
          {databases.rows.map(function toRow(row) {
            return (
              <DatabaseRow
                key={row.name}
                name={row.name}
                state={row.state}
                localPort={row.localPort}
                onConnect={function connect() {
                  databases.connect(row.name);
                }}
                onDisconnect={function disconnect() {
                  databases.disconnect(row.name);
                }}
                onPortChange={function changePort(port) {
                  databases.updateLocalPort(row.name, port);
                }}
                onCopyPassword={function copy() {
                  return databases.copyPassword(row.name);
                }}
                onCopyPasswordUrlEncoded={function copy() {
                  return databases.copyPasswordUrlEncoded(row.name);
                }}
              />
            );
          })}
        </DataTable>
      </div>
    </>
  );
}
