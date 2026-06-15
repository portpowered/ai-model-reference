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
const CI_STATIC_EXPORT_BUILD_BUN_TEST_TIMEOUT_MS = 600_000;
const LOCAL_STATIC_EXPORT_BUILD_BUN_TEST_TIMEOUT_MS = 600_000;
const STATIC_EXPORT_BUILD_LOCK_WAIT_HEADROOM_MS = 30_000;

/**
 * Bun test ceiling for rows that call `runStaticExportBuild`. Under a full `make test`
 * run, export build tests serialize on one lock; 180s per test is insufficient once
 * lock queue time is included.
 */
export function getStaticExportBuildBunTestTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true"
    ? CI_STATIC_EXPORT_BUILD_BUN_TEST_TIMEOUT_MS
    : LOCAL_STATIC_EXPORT_BUILD_BUN_TEST_TIMEOUT_MS;
}

export function getStaticExportBuildLockMaxWaitMs(
  env: Record<string, string | undefined> = process.env,
): number {
  return (
    getStaticExportBuildBunTestTimeoutMs(env) -
    STATIC_EXPORT_BUILD_LOCK_WAIT_HEADROOM_MS
  );
}

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
  const deadline = Date.now() + getStaticExportBuildLockMaxWaitMs();
  while (true) {
    if (tryAcquireStaticExportBuildLockSync()) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for static export build lock at ${STATIC_EXPORT_BUILD_LOCK_PATH}`,
      );
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
