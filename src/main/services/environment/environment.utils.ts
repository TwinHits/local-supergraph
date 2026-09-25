import { type EnvironmentValues } from "@/main/services/environment/environment.types";

const COMMENT_PREFIX = "#";
const ASSIGNMENT = "=";
const LINE_BREAK = "\n";

/** The variable a .env line assigns, or null for a comment, a blank line, or anything else. */
function readVariableName(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.startsWith(COMMENT_PREFIX)) {
    return null;
  }
  const assignmentIndex = trimmed.indexOf(ASSIGNMENT);
  if (assignmentIndex <= 0) {
    return null;
  }
  return trimmed.slice(0, assignmentIndex).trim();
}

/** The values that are actually set, as name and value pairs. */
function listSetValues(values: EnvironmentValues): [string, string][] {
  return Object.entries(values).filter(function isSet(entry): entry is [
    string,
    string,
  ] {
    return entry[1] !== undefined;
  });
}

/** Sets each variable in a .env file's text, keeping every other line. */
export function mergeEnvContents(
  existing: string,
  values: EnvironmentValues
): string {
  const updates = new Map(listSetValues(values));
  const lines =
    existing === "" ? [] : existing.replace(/\n$/, "").split(LINE_BREAK);
  const present = new Set(lines.map(readVariableName));

  const merged = lines.map(function replaceOwned(line) {
    const name = readVariableName(line);
    if (name === null || !updates.has(name)) {
      return line;
    }
    return `${name}${ASSIGNMENT}${updates.get(name)}`;
  });
  const appended = [...updates.entries()]
    .filter(function isAbsent([name]) {
      return !present.has(name);
    })
    .map(function toLine([name, value]) {
      return `${name}${ASSIGNMENT}${value}`;
    });

  return [...merged, ...appended].join(LINE_BREAK) + LINE_BREAK;
}
