import { open, stat } from "node:fs/promises";

import { type LogSource } from "@/main/services/logs/logs.types";
import { ROVER_LOG_FILE } from "@/main/services/rover/rover.constants";
import { type Awaitable } from "@/shared/contract/contract.types";
import { type LogsContract } from "@/shared/logs/logs.contract";
import {
  type LogChunk,
  type LogCursor,
  type LogLine,
  LogSourceId,
} from "@/shared/logs/logs.types";

const START_OF_FILE = 0;

/** The byte offset a cursor encodes, or the start of the file when there isn't one. */
function decodeOffset(cursor: LogCursor): number {
  return cursor === null ? START_OF_FILE : Number(cursor);
}

/** Encodes a byte offset as the cursor callers pass back on their next read. */
function encodeOffset(offset: number): LogCursor {
  return String(offset);
}

/**
 * Splits a chunk of file text into lines, dropping the empty element left by
 * a trailing newline rather than treating it as a blank line of its own.
 */
function splitLines(text: string): LogLine[] {
  const lines = text.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.map(function toLine(line): LogLine {
    return { timestamp: null, text: line };
  });
}

/** Reads only the bytes a file has gained between two offsets. */
async function readRange(
  path: string,
  start: number,
  end: number
): Promise<string> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(end - start);
    await handle.read(buffer, 0, buffer.length, start);
    return buffer.toString("utf8");
  } finally {
    await handle.close();
  }
}

/**
 * A log source backed by a plain file, resumed by byte offset. A file
 * smaller than the requested offset has been truncated since the last read,
 * so the read resets to the beginning instead of failing.
 */
function buildFileLogSource(path: string): LogSource {
  return {
    async read(cursor: LogCursor): Promise<LogChunk> {
      const requestedOffset = decodeOffset(cursor);
      let size: number;
      try {
        size = (await stat(path)).size;
      } catch {
        size = START_OF_FILE;
      }

      const truncated = size < requestedOffset;
      const startOffset = truncated ? START_OF_FILE : requestedOffset;

      if (size === startOffset) {
        return {
          lines: [],
          cursor: encodeOffset(startOffset),
          reset: truncated,
        };
      }

      const text = await readRange(path, startOffset, size);
      return {
        lines: splitLines(text),
        cursor: encodeOffset(size),
        reset: truncated,
      };
    },
  };
}

const sources: Record<LogSourceId, LogSource> = {
  [LogSourceId.Rover]: buildFileLogSource(ROVER_LOG_FILE),
};

export const logs: Awaitable<LogsContract> = {
  async read(sourceId: LogSourceId, cursor: LogCursor): Promise<LogChunk> {
    return sources[sourceId].read(cursor);
  },
};
