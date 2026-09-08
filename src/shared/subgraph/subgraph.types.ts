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

export type OverrideMap = Record<string, Override>;

export type HealthMap = Record<string, Reachability>;

/** Everything the table needs for one line. */
export type Row = {
  name: string;
  routingUrl: string;
  local: boolean;
  port: number | null;
  status: RowStatus;
  reason: string;
};
