import { type LogChunk, type LogCursor } from "@/shared/logs/logs.types";

/** Reads the next chunk of one log, resumed from an opaque cursor. */
export type LogSource = {
  read(cursor: LogCursor): Promise<LogChunk>;
};
