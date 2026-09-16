/** Where a database connection is in its lifecycle. */
export enum DatabaseConnectionState {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
}

/** Every database, and the environments it can be reached in. */
export type DatabaseCatalog = Record<string, string[]>;

/** What a DB client needs to connect, once a tunnel is open. */
export type DatabaseConnectionInfo = {
  host: string;
  port: number;
  localPort: number;
  databaseName: string;
  username: string;
};
