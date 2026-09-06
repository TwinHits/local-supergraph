export enum Reachability {
  Unknown = "unknown",
  Reachable = "reachable",
  Unreachable = "unreachable",
}

export enum Composition {
  NotRunning = "not-running",
  Composed = "composed",
  Failed = "failed",
}

export enum RowStatus {
  Pending = "pending",
  Healthy = "healthy",
  Failed = "failed",
}

export enum SortColumn {
  Status = "status",
  Name = "name",
  Local = "local",
}

export type Override = {
  local: boolean;
  port: number | null;
};

/** One subgraph as Studio describes it. */
export type Subgraph = {
  name: string;
  routingUrl: string;
};

export type OverrideMap = Record<string, Override>;

export type HealthMap = Record<string, Reachability>;

/** Everything the table needs for one line, after the sources are merged. */
export type Row = {
  name: string;
  routingUrl: string;
  local: boolean;
  port: number | null;
  status: RowStatus;
  reason: string;
};
