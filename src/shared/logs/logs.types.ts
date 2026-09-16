/** Which log the renderer is reading. */
export enum LogSourceId {
  Rover = "rover",
  DatabaseConnection = "database-connection",
}

/** A source's position in its own log, opaque to everything but that source. */
export type LogCursor = string | null;

/** One line of log output. */
export type LogLine = {
  timestamp: number | null;
  text: string;
};

/** New lines since the last read, and the cursor to resume from next. */
export type LogChunk = {
  lines: LogLine[];
  cursor: LogCursor;
  reset: boolean;
};
