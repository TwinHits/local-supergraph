import {
  type DatabaseCatalog,
  type DatabaseConnectionInfo,
  type DatabaseConnectionState,
  type DatabaseRowState,
  type LocalPortMap,
} from "@/shared/databases/databases.types";

/** What the renderer may do with database connections. */
export type DatabasesContract = {
  catalog(): DatabaseCatalog;
  connectionInfo(
    database: string,
    environment: string
  ): DatabaseConnectionInfo | null;
  connect(database: string, environment: string): DatabaseConnectionState;
  disconnect(database: string): DatabaseConnectionState;
  statuses(): Record<string, DatabaseRowState>;
  localPorts(): LocalPortMap;
  updateLocalPort(database: string, environment: string, port: number): number;
  copyPasswordToClipboard(database: string, environment: string): boolean;
  copyPasswordUrlEncodedToClipboard(
    database: string,
    environment: string
  ): boolean;
  ssoLogin(database: string, environment: string): boolean;
};
