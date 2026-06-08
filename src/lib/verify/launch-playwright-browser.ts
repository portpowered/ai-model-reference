import { closeSync, constants, openSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, chromium, type LaunchOptions } from "playwright";

const CROSS_PROCESS_LOCK_FILE = join(
  tmpdir(),
  "model-atlas-playwright-launch.lock",
);
const LOCK_POLL_MS = 200;
const LOCK_STALE_MS = 300_000;

let inProcessLaunchGate: Promise<void> = Promise.resolve();

function shouldSerializePlaywrightLaunch(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function tryAcquireCrossProcessLock(): (() => void) | null {
  try {
    const fd = openSync(
      CROSS_PROCESS_LOCK_FILE,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    closeSync(fd);
    return () => {
      try {
        unlinkSync(CROSS_PROCESS_LOCK_FILE);
      } catch {
        // ignore races when another process already removed the lock
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

function readCrossProcessLockAgeMs(): number | null {
  try {
    const stat = statSync(CROSS_PROCESS_LOCK_FILE);
    return Date.now() - stat.mtimeMs;
  } catch {
    return null;
  }
}

async function acquireCrossProcessLaunchLock(): Promise<() => void> {
  while (true) {
    const release = tryAcquireCrossProcessLock();
    if (release) {
      return release;
    }

    const lockAgeMs = readCrossProcessLockAgeMs();
    if (lockAgeMs !== null && lockAgeMs > LOCK_STALE_MS) {
      try {
        unlinkSync(CROSS_PROCESS_LOCK_FILE);
      } catch {
        // another waiter may have cleared the stale lock first
      }
      continue;
    }

    await sleep(LOCK_POLL_MS);
  }
}

async function withCiLaunchSerialization<T>(
  launch: () => Promise<T>,
): Promise<T> {
  const waitForPriorLaunch = inProcessLaunchGate;
  let releaseInProcessGate!: () => void;
  inProcessLaunchGate = new Promise<void>((resolve) => {
    releaseInProcessGate = resolve;
  });

  await waitForPriorLaunch;
  const releaseCrossProcessLock = await acquireCrossProcessLaunchLock();
  try {
    return await launch();
  } finally {
    releaseCrossProcessLock();
    releaseInProcessGate();
  }
}

/**
 * Launches Chromium for export/integration verifiers. Under CI, launches are
 * serialized in-process and across parallel `bun test` workers so browser
 * startup does not stampede the runner.
 */
export async function launchPlaywrightBrowser(
  options: LaunchOptions = {},
): Promise<Browser> {
  if (!shouldSerializePlaywrightLaunch()) {
    return chromium.launch({ headless: true, ...options });
  }

  return withCiLaunchSerialization(() =>
    chromium.launch({ headless: true, ...options }),
  );
}
