import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot: string = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);
const packageJsonPath: string = path.join(projectRoot, "package.json");
const cacheFilePath: string = path.join(projectRoot, ".package-version-cache");

interface PackageJson {
  version: string;
}

/** Reads the version field from package.json. */
function readCurrentVersion(): string {
  const packageJsonContents: string = readFileSync(packageJsonPath, "utf8");
  const packageJson: PackageJson = JSON.parse(packageJsonContents);
  return packageJson.version;
}

/** Reads the previously cached version, or null if none exists. */
function readCachedVersion(): string | null {
  if (!existsSync(cacheFilePath)) {
    return null;
  }
  return readFileSync(cacheFilePath, "utf8").trim();
}

/** Writes the given version to the cache file. */
function writeCachedVersion(version: string): void {
  writeFileSync(cacheFilePath, version, "utf8");
}

/** Main */
const currentVersion: string = readCurrentVersion();
const cachedVersion: string | null = readCachedVersion();

if (currentVersion !== cachedVersion) {
  execSync("npm run ci", { stdio: "inherit", cwd: projectRoot });
  writeCachedVersion(currentVersion);
}
