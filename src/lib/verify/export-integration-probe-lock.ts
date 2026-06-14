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
const STALE_PROBE_LOCK_MAX_AGE_MS = 5 * 60 * 1000;
/** Recover faster when parallel tests abandon a probe lock after Bun timeouts. */
const AGGRESSIVE_STALE_PROBE_LOCK_MAX_AGE_MS = 30_000;
const AGGRESSIVE_STALE_PROBE_LOCK_POLL_THRESHOLD = 25;

let exportIntegrationProbeLockDepth = 0;

export function isInsideExportIntegrationProbeLock(): boolean {
  return exportIntegrationProbeLockDepth > 0;
}

export function shouldSerializeExportIntegrationProbes(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
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
 * Gates Playwright HTTP verifier unit tests colocated under `src/lib/verify/`.
 * Skip during the coverage subprocess rerun (`make ci` runs the full suite twice).
 */
export function shouldRunPlaywrightHttpVerifierUnitTests(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return shouldRunExportIntegrationProbeTests(env);
}

/**
 * Served-export probe for Phase 1 canonical `/search` queries on a GitHub Pages
 * base path. Under CI serialization the prefixed GQA hydration probe in
 * `static-export-search-hydration.test.ts` already exercises the same path
 * earlier in the suite; skipping this file's duplicate probe avoids a 60m Bun
 * ceiling when it queues behind build/probe locks late in the full test run.
 */
export function shouldRunServedPhase1CanonicalQueriesProbe(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!shouldRunExportIntegrationProbeTests(env)) {
    return false;
  }
  if (shouldSerializeExportIntegrationProbes(env)) {
    return false;
  }
  return true;
}

/**
 * Serialized export probes in CI; allow queue wait, stale lock/slot recovery, and one probe run.
 * Must exceed cumulative probe-lock queue plus Playwright launch-slot stale recovery (see launch-playwright-browser).
 */
const CI_EXPORT_INTEGRATION_BUN_TEST_TIMEOUT_MS = 3_600_000;

/**
 * Bun test ceiling for integration tests that queue on `withExportIntegrationProbeLock`.
 * Under CI, `make coverage` runs a second full suite where export Playwright probes
 * serialize; 300s per test is insufficient once lock wait time is included.
 */
export function getExportIntegrationBunTestTimeoutMs(): number {
  return shouldSerializeExportIntegrationProbes()
    ? CI_EXPORT_INTEGRATION_BUN_TEST_TIMEOUT_MS
    : 300_000;
}

/** @deprecated Prefer `getExportIntegrationBunTestTimeoutMs()` at test registration time. */
export const EXPORT_INTEGRATION_BUN_TEST_TIMEOUT_MS =
  getExportIntegrationBunTestTimeoutMs();

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function removeStaleProbeLockIfNeeded(
  maxAgeMs: number = STALE_PROBE_LOCK_MAX_AGE_MS,
): void {
  try {
    const { mtimeMs } = statSync(EXPORT_INTEGRATION_PROBE_LOCK_PATH);
    if (Date.now() - mtimeMs > maxAgeMs) {
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
  let polls = 0;
  while (true) {
    const release = tryAcquireProbeLock();
    if (release) {
      return release;
    }
    polls += 1;
    if (polls % AGGRESSIVE_STALE_PROBE_LOCK_POLL_THRESHOLD === 0) {
      removeStaleProbeLockIfNeeded(AGGRESSIVE_STALE_PROBE_LOCK_MAX_AGE_MS);
    }
    await sleep(LOCK_POLL_MS);
  }
}

/** Test-only helper to clear abandoned probe locks and leaked depth counters. */
export function removeExportIntegrationProbeLockForTests(): void {
  exportIntegrationProbeLockDepth = 0;
  try {
    unlinkSync(EXPORT_INTEGRATION_PROBE_LOCK_PATH);
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

/**
 * Serializes export Playwright integration probes under CI so parallel test
 * files do not stampede browser startup or contend on shared `out/` artifacts.
 */
export async function withExportIntegrationProbeLock<T>(
  probe: () => Promise<T>,
): Promise<T> {
  if (!shouldSerializeExportIntegrationProbes()) {
    exportIntegrationProbeLockDepth += 1;
    try {
      return await probe();
    } finally {
      exportIntegrationProbeLockDepth -= 1;
    }
  }

  const release = await acquireProbeLock();
  exportIntegrationProbeLockDepth += 1;
  try {
    return await probe();
  } finally {
    exportIntegrationProbeLockDepth -= 1;
    release();
  }
}
