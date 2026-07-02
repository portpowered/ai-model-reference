import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { closeSync, constants, openSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sleepSync } from "bun";

export const NEXT_PRODUCTION_BUILD_LOCK_PATH = join(
  tmpdir(),
  "model-atlas-next-production-build.lock",
);

const LOCK_POLL_MS = 250;
const STALE_NEXT_PRODUCTION_BUILD_LOCK_MAX_AGE_MS = 5 * 60 * 1000;
const CI_NEXT_PRODUCTION_BUILD_BUN_TEST_TIMEOUT_MS = 600_000;
const LOCAL_NEXT_PRODUCTION_BUILD_BUN_TEST_TIMEOUT_MS = 600_000;
const NEXT_PRODUCTION_BUILD_LOCK_WAIT_HEADROOM_MS = 30_000;

export function getNextProductionBuildBunTestTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true"
    ? CI_NEXT_PRODUCTION_BUILD_BUN_TEST_TIMEOUT_MS
    : LOCAL_NEXT_PRODUCTION_BUILD_BUN_TEST_TIMEOUT_MS;
}

function getNextProductionBuildLockMaxWaitMs(
  env: Record<string, string | undefined> = process.env,
): number {
  return (
    getNextProductionBuildBunTestTimeoutMs(env) -
    NEXT_PRODUCTION_BUILD_LOCK_WAIT_HEADROOM_MS
  );
}

function removeStaleBuildLockIfNeeded(): void {
  try {
    const { mtimeMs } = statSync(NEXT_PRODUCTION_BUILD_LOCK_PATH);
    if (Date.now() - mtimeMs > STALE_NEXT_PRODUCTION_BUILD_LOCK_MAX_AGE_MS) {
      unlinkSync(NEXT_PRODUCTION_BUILD_LOCK_PATH);
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

function tryAcquireNextProductionBuildLockSync(): boolean {
  removeStaleBuildLockIfNeeded();
  try {
    const fileDescriptor = openSync(
      NEXT_PRODUCTION_BUILD_LOCK_PATH,
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

function acquireNextProductionBuildLockSync(
  env: Record<string, string | undefined> = process.env,
): void {
  const deadline = Date.now() + getNextProductionBuildLockMaxWaitMs(env);
  while (true) {
    if (tryAcquireNextProductionBuildLockSync()) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for next production build lock at ${NEXT_PRODUCTION_BUILD_LOCK_PATH}`,
      );
    }
    sleepSync(LOCK_POLL_MS);
  }
}

function releaseNextProductionBuildLockSync(): void {
  try {
    unlinkSync(NEXT_PRODUCTION_BUILD_LOCK_PATH);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export type RunNextProductionBuildOptions = {
  cwd: string;
  env?: Record<string, string | undefined>;
};

/**
 * Runs `bun run build` under a process-wide lock so Bun workers do not race on
 * shared `.next` artifacts during build-gated integration tests.
 */
export function runNextProductionBuild(
  options: RunNextProductionBuildOptions,
): SpawnSyncReturns<string> {
  const env = {
    ...process.env,
    ...options.env,
  };

  acquireNextProductionBuildLockSync(env);
  try {
    return spawnSync("bun", ["run", "build"], {
      cwd: options.cwd,
      encoding: "utf8",
      env,
    });
  } finally {
    releaseNextProductionBuildLockSync();
  }
}
