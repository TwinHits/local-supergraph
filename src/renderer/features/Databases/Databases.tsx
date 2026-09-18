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
import { type DatabaseConnectionInfo } from "@/shared/databases/databases.types";

const DATABASES_NAME = "Databases";
const NAME_COLUMN_KEY = "name";

const COLUMNS: Column[] = [
  { key: "expand", label: "", sortable: false },
  { key: "status", label: "Status", sortable: false },
  { key: NAME_COLUMN_KEY, label: "Name", sortable: true },
  { key: "localPort", label: "Local port", sortable: false },
  { key: "connection", label: "", sortable: false },
];

/** Connects to RDS databases over SSM port-forwarding sessions. */
export default function Databases() {
  const databases = useDatabases();
  const modal = useErrorModal();
  const [expandedNames, setExpandedNames] = useState<Record<string, boolean>>(
    {}
  );
  const [connectionInfoByName, setConnectionInfoByName] = useState<
    Record<string, DatabaseConnectionInfo | null>
  >({});

  /** Opens or closes a row's connection-info drawer, loading its info the first time it opens. */
  function toggleExpanded(name: string): void {
    const expanding = expandedNames[name] !== true;
    setExpandedNames(function toggle(current) {
      return { ...current, [name]: expanding };
    });
    if (expanding && connectionInfoByName[name] === undefined) {
      void databases.connectionInfo(name).then(function apply(info) {
        setConnectionInfoByName(function merge(current) {
          return { ...current, [name]: info };
        });
      });
    }
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
        >
          {sortDatabaseRowsByName(databases.rows).map(function toRow(row) {
            return (
              <DatabaseRow
                key={row.name}
                name={row.name}
                state={row.state}
                localPort={row.localPort}
                expanded={expandedNames[row.name] === true}
                connectionInfo={connectionInfoByName[row.name]}
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
