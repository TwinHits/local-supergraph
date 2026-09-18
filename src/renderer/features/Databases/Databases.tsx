import { useState } from "react";

import AwsSsoLoginAction from "@/renderer/features/Databases/components/AwsSsoLoginAction";
import DatabaseRow from "@/renderer/features/Databases/components/DatabaseRow";
import styles from "@/renderer/features/Databases/Databases.module.scss";
import { sortDatabaseRowsByName } from "@/renderer/features/Databases/databases.utils";
import { useDatabases } from "@/renderer/features/Databases/useDatabases";
import ErrorModal from "@/renderer/features/ErrorModal";
import { useErrorModal } from "@/renderer/features/ErrorModal/useErrorModal";
import DataTable, { type Column } from "@/renderer/ui/DataTable";
import DropdownSelect from "@/renderer/ui/DropdownSelect";
import ErrorBanner from "@/renderer/ui/ErrorBanner";

const DATABASES_NAME = "Databases";
const NAME_COLUMN_KEY = "name";

const COLUMNS: Column[] = [
  { key: "expand", label: "", sortable: false, width: "56px" },
  { key: "status", label: "Status", sortable: false, width: "130px" },
  { key: NAME_COLUMN_KEY, label: "Name", sortable: true },
  { key: "localPort", label: "Local port", sortable: false, width: "200px" },
  { key: "connection", label: "", sortable: false, width: "120px" },
];

/** Connects to RDS databases over SSM port-forwarding sessions. */
export default function Databases() {
  const databases = useDatabases();
  const modal = useErrorModal();
  const [expandedNames, setExpandedNames] = useState<Record<string, boolean>>(
    {}
  );

  /** Opens or closes a row's connection-info drawer. */
  function toggleExpanded(name: string): void {
    setExpandedNames(function toggle(current) {
      return { ...current, [name]: current[name] !== true };
    });
  }

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
            onClick={function showErrors() {
              modal.show(DATABASES_NAME, databases.errors);
            }}
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
          sortKey={NAME_COLUMN_KEY}
          onSort={function noop() {}}
          className={styles.databases__table}
        >
          {sortDatabaseRowsByName(databases.rows).map(function toRow(row) {
            return (
              <DatabaseRow
                key={row.name}
                name={row.name}
                state={row.state}
                localPort={row.localPort}
                expanded={expandedNames[row.name] === true}
                connectionInfo={databases.connectionInfoByName[row.name]}
                onToggleExpanded={function toggle() {
                  toggleExpanded(row.name);
                }}
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
