import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { closeSync, openSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sleepSync } from "bun";

const STATIC_EXPORT_BUILD_LOCK_PATH = join(
  tmpdir(),
  "model-atlas-static-export-build.lock",
);

function acquireStaticExportBuildLockSync(): void {
  const retryDelayMs = 250;

  while (true) {
    try {
      const fileDescriptor = openSync(STATIC_EXPORT_BUILD_LOCK_PATH, "wx");
      closeSync(fileDescriptor);
      return;
    } catch (error) {
      const errno = (error as NodeJS.ErrnoException).code;
      if (errno !== "EEXIST") {
        throw error;
      }
      sleepSync(retryDelayMs);
    }
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
