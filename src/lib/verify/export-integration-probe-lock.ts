import { closeSync, constants, openSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXPORT_INTEGRATION_PROBE_LOCK_PATH = join(
  tmpdir(),
  "model-atlas-export-integration-probe.lock",
);
const LOCK_POLL_MS = 200;

function shouldSerializeExportIntegrationProbes(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function tryAcquireProbeLock(): (() => void) | null {
  try {
    const fd = openSync(
      EXPORT_INTEGRATION_PROBE_LOCK_PATH,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    closeSync(fd);
    return () => {
      try {
        unlinkSync(EXPORT_INTEGRATION_PROBE_LOCK_PATH);
      } catch {
        // ignore release races
      }
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      return null;
    }
    throw error;
  }
}

async function acquireProbeLock(): Promise<() => void> {
  while (true) {
    const release = tryAcquireProbeLock();
    if (release) {
      return release;
    }
    await sleep(LOCK_POLL_MS);
  }
}

/**
 * Serializes export Playwright integration probes under CI so parallel test
 * files do not stampede browser startup or contend on shared `out/` artifacts.
 */
export async function withExportIntegrationProbeLock<T>(
  probe: () => Promise<T>,
): Promise<T> {
  if (!shouldSerializeExportIntegrationProbes()) {
    return probe();
  }

  const release = await acquireProbeLock();
  try {
    return await probe();
  } finally {
    release();
  }
}
