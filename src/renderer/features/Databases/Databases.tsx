import styles from "@/renderer/features/Databases/Databases.module.scss";
import { useDatabases } from "@/renderer/features/Databases/useDatabases";
import LogsDrawer, { useLogsDrawer } from "@/renderer/features/LogsDrawer";
import ErrorBanner from "@/renderer/ui/ErrorBanner";
import TextLabel from "@/renderer/ui/TextLabel";
import { DatabaseConnectionState } from "@/shared/databases/databases.types";
import { LogSourceId } from "@/shared/logs/logs.types";

const STATUS_LABELS: Record<DatabaseConnectionState, string> = {
  [DatabaseConnectionState.Disconnected]: "Disconnected",
  [DatabaseConnectionState.Connecting]: "Connecting",
  [DatabaseConnectionState.Connected]: "Connected",
};

/** Connects to an RDS database over an SSM port-forwarding session. */
export default function Databases() {
  const databases = useDatabases();
  const logsDrawer = useLogsDrawer(LogSourceId.DatabaseConnection);

  return (
    <>
      <div className={styles.databases__content}>
        {databases.errors.length > 0 && (
          <ErrorBanner diagnoses={databases.errors} />
        )}
        {databases.connectionInfo !== null && (
          <div className={styles.databases__info}>
            <span className={styles.databases__field}>
              <TextLabel muted>Host</TextLabel>
              <TextLabel>{databases.connectionInfo.host}</TextLabel>
            </span>
            <span className={styles.databases__field}>
              <TextLabel muted>Port</TextLabel>
              <TextLabel>{databases.connectionInfo.localPort}</TextLabel>
            </span>
            <span className={styles.databases__field}>
              <TextLabel muted>Database</TextLabel>
              <TextLabel>{databases.connectionInfo.databaseName}</TextLabel>
            </span>
            <span className={styles.databases__field}>
              <TextLabel muted>Username</TextLabel>
              <TextLabel>{databases.connectionInfo.username}</TextLabel>
            </span>
            <span className={styles.databases__field}>
              <TextLabel muted>Status</TextLabel>
              <TextLabel>{STATUS_LABELS[databases.state]}</TextLabel>
            </span>
          </div>
        )}
      </div>
      <LogsDrawer drawer={logsDrawer} />
    </>
  );
}
