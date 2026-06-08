import { closeSync, constants, openSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VERIFY_COVERAGE_SUBPROCESS_ENV } from "./server-lifecycle";

const EXPORT_INTEGRATION_PROBE_LOCK_PATH = join(
  tmpdir(),
  "model-atlas-export-integration-probe.lock",
);
const LOCK_POLL_MS = 200;
/** Drop probe locks left behind by crashed workers so queued tests do not stall until Bun timeout. */
const STALE_PROBE_LOCK_MAX_AGE_MS = 20 * 60 * 1000;

export function shouldSerializeExportIntegrationProbes(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

/**
 * Gates served-export Playwright probes: skip the coverage subprocess rerun
 * (`make ci` runs the full suite twice; probes already passed in `make test`).
 */
export function shouldRunExportIntegrationProbeTests(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[VERIFY_COVERAGE_SUBPROCESS_ENV] !== "1";
}

/**
 * Bun test ceiling for integration tests that queue on `withExportIntegrationProbeLock`.
 * Under CI, `make coverage` runs a second full suite where export Playwright probes
 * serialize; 300s per test is insufficient once lock wait time is included.
 */
export function getExportIntegrationBunTestTimeoutMs(): number {
  return shouldSerializeExportIntegrationProbes() ? 1_200_000 : 300_000;
}

/** @deprecated Prefer `getExportIntegrationBunTestTimeoutMs()` at test registration time. */
export const EXPORT_INTEGRATION_BUN_TEST_TIMEOUT_MS =
  getExportIntegrationBunTestTimeoutMs();

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function removeStaleProbeLockIfNeeded(): void {
  try {
    const { mtimeMs } = statSync(EXPORT_INTEGRATION_PROBE_LOCK_PATH);
    if (Date.now() - mtimeMs > STALE_PROBE_LOCK_MAX_AGE_MS) {
      unlinkSync(EXPORT_INTEGRATION_PROBE_LOCK_PATH);
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
      removeStaleProbeLockIfNeeded();
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
