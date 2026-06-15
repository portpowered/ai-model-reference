import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Written after `next build` so opt-in tests can skip stale `.next` artifacts. */
export const BUILD_SOURCE_FINGERPRINT_RELATIVE_PATH =
  ".next/verify-build-source-fingerprint";

function hashFileContents(path: string): string {
  if (!existsSync(path)) {
    return "missing";
  }
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex")
    .slice(0, 16);
}

function readGitHead(projectRoot: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return "no-git";
  }
  return result.stdout.trim();
}

function readGitDirtyHash(projectRoot: string): string {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return "unknown-dirty";
  }
  return createHash("sha256").update(result.stdout).digest("hex").slice(0, 16);
}

/** Deterministic source snapshot used to gate built HTML and production-server tests. */
export function computeBuildSourceFingerprint(projectRoot: string): string {
  return [
    readGitHead(projectRoot),
    readGitDirtyHash(projectRoot),
    hashFileContents(join(projectRoot, "bun.lock")),
    hashFileContents(join(projectRoot, "package.json")),
  ].join(":");
}

export function resolveBuildSourceFingerprintPath(
  projectRoot: string = process.cwd(),
): string {
  return join(projectRoot, BUILD_SOURCE_FINGERPRINT_RELATIVE_PATH);
}

export function readBuildSourceFingerprint(
  projectRoot: string = process.cwd(),
): string | null {
  const path = resolveBuildSourceFingerprintPath(projectRoot);
  if (!existsSync(path)) {
    return null;
  }
  const value = readFileSync(path, "utf8").trim();
  return value.length > 0 ? value : null;
}

export function writeBuildSourceFingerprint(
  projectRoot: string = process.cwd(),
  fingerprint: string = computeBuildSourceFingerprint(projectRoot),
): string {
  const path = resolveBuildSourceFingerprintPath(projectRoot);
  writeFileSync(path, `${fingerprint}\n`, "utf8");
  return fingerprint;
}

/** True when a completed build was produced from the current source snapshot. */
export function isNextProductionBuildFresh(
  projectRoot: string = process.cwd(),
): boolean {
  const stored = readBuildSourceFingerprint(projectRoot);
  if (!stored) {
    return false;
  }
  return stored === computeBuildSourceFingerprint(projectRoot);
}
