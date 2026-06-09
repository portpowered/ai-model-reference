import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { closeSync, constants, openSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sleepSync } from "bun";

export const STATIC_EXPORT_BUILD_LOCK_PATH = join(
  tmpdir(),
  "model-atlas-static-export-build.lock",
);

const LOCK_POLL_MS = 250;
/** Drop build locks left behind by crashed workers so queued tests do not stall until Bun timeout. */
export const STALE_STATIC_EXPORT_BUILD_LOCK_MAX_AGE_MS = 5 * 60 * 1000;

function removeStaleBuildLockIfNeeded(): void {
  try {
    const { mtimeMs } = statSync(STATIC_EXPORT_BUILD_LOCK_PATH);
    if (Date.now() - mtimeMs > STALE_STATIC_EXPORT_BUILD_LOCK_MAX_AGE_MS) {
      unlinkSync(STATIC_EXPORT_BUILD_LOCK_PATH);
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

function tryAcquireStaticExportBuildLockSync(): boolean {
  removeStaleBuildLockIfNeeded();
  try {
    const fileDescriptor = openSync(
      STATIC_EXPORT_BUILD_LOCK_PATH,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    closeSync(fileDescriptor);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      return false;
    }
    throw error;
  }
}

function acquireStaticExportBuildLockSync(): void {
  while (true) {
    if (tryAcquireStaticExportBuildLockSync()) {
      return;
    }
    sleepSync(LOCK_POLL_MS);
  }
}

function releaseStaticExportBuildLockSync(): void {
  try {
    unlinkSync(STATIC_EXPORT_BUILD_LOCK_PATH);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export type RunStaticExportBuildOptions = {
  cwd: string;
  env?: Record<string, string | undefined>;
};

/**
 * Runs `bun run build:export` under a process-wide lock so integration tests
 * do not race on shared `out/` and `.next/` directories.
 */
export function runStaticExportBuild(
  options: RunStaticExportBuildOptions,
): SpawnSyncReturns<string> {
  acquireStaticExportBuildLockSync();
  try {
    return spawnSync("bun", ["run", "build:export"], {
      cwd: options.cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        ...options.env,
      },
    });
  } finally {
    releaseStaticExportBuildLockSync();
  }
}
