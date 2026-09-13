import {
  type LogChunk,
  type LogCursor,
  type LogSourceId,
} from "@/shared/logs/logs.types";

/** What the renderer may ask about a log source. */
export type LogsContract = {
  read(sourceId: LogSourceId, cursor: LogCursor): LogChunk;
};
