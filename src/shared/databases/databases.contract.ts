import {
  type DatabaseCatalog,
  type DatabaseConnectionInfo,
  type DatabaseConnectionState,
} from "@/shared/databases/databases.types";

/** What the renderer may do with database connections. */
export type DatabasesContract = {
  catalog(): DatabaseCatalog;
  connectionInfo(
    database: string,
    environment: string
  ): DatabaseConnectionInfo | null;
  connect(database: string, environment: string): DatabaseConnectionState;
  disconnect(): DatabaseConnectionState;
  status(): DatabaseConnectionState;
  copyPasswordToClipboard(database: string, environment: string): boolean;
  selectedDatabase(): string;
  updateSelectedDatabase(name: string): string;
  selectedEnvironment(): string;
  updateSelectedEnvironment(name: string): string;
};
