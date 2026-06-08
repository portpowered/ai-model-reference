import {
  closeSync,
  constants,
  mkdirSync,
  openSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, chromium, type LaunchOptions } from "playwright";

const CI_PLAYWRIGHT_LAUNCH_TIMEOUT_MS = 120_000;
const CI_PLAYWRIGHT_LAUNCH_ATTEMPTS = 2;
const CI_PLAYWRIGHT_LAUNCH_RETRY_DELAY_MS = 2_000;
const MAX_CONCURRENT_CI_LAUNCHES = 2;
const LAUNCH_SLOT_DIR = join(tmpdir(), "model-atlas-playwright-launch-slots");
const LOCK_POLL_MS = 200;
/** Drop launch slots left behind by crashed workers so waiters do not poll until Bun timeout. */
const STALE_LAUNCH_SLOT_MAX_AGE_MS = 20 * 60 * 1000;

let inProcessLaunchGate: Promise<void> = Promise.resolve();

function shouldSerializePlaywrightLaunch(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

function resolveLaunchOptions(options: LaunchOptions): LaunchOptions {
  if (!shouldSerializePlaywrightLaunch()) {
    return { headless: true, ...options };
  }

  return {
    headless: true,
    timeout: options.timeout ?? CI_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
    ...options,
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function launchSlotPath(slotId: number): string {
  return join(LAUNCH_SLOT_DIR, `slot-${slotId}`);
}

function removeStaleLaunchSlotIfNeeded(slotPath: string): void {
  try {
    const { mtimeMs } = statSync(slotPath);
    if (Date.now() - mtimeMs > STALE_LAUNCH_SLOT_MAX_AGE_MS) {
      unlinkSync(slotPath);
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

export function isPlaywrightLaunchTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "TimeoutError" &&
    /launch: Timeout \d+ms exceeded/.test(error.message)
  );
}

function tryAcquireLaunchSlot(): (() => void) | null {
  mkdirSync(LAUNCH_SLOT_DIR, { recursive: true });

  for (let slotId = 0; slotId < MAX_CONCURRENT_CI_LAUNCHES; slotId += 1) {
    const slotPath = launchSlotPath(slotId);
    removeStaleLaunchSlotIfNeeded(slotPath);
    try {
      const fd = openSync(
        slotPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
        0o600,
      );
      closeSync(fd);
      return () => {
        try {
          unlinkSync(slotPath);
        } catch {
          // ignore races when another waiter already reclaimed the slot
        }
      };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        continue;
      }
      throw error;
    }
  }

  return null;
}

async function acquireLaunchSlot(): Promise<() => void> {
  while (true) {
    const release = tryAcquireLaunchSlot();
    if (release) {
      return release;
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
  const releaseLaunchSlot = await acquireLaunchSlot();
  try {
    return await launch();
  } finally {
    releaseLaunchSlot();
    releaseInProcessGate();
  }
}

/**
 * Launches Chromium for export/integration verifiers. Under CI, launches are
 * serialized within a worker and limited to a small cross-process slot pool so
 * parallel `bun test` files do not stampede or fully queue browser startup.
 */
async function launchChromiumWithCiRetries(
  launchOptions: LaunchOptions,
): Promise<Browser> {
  let lastError: unknown;
  for (
    let attempt = 1;
    attempt <= CI_PLAYWRIGHT_LAUNCH_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await withCiLaunchSerialization(() =>
        chromium.launch(launchOptions),
      );
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < CI_PLAYWRIGHT_LAUNCH_ATTEMPTS &&
        isPlaywrightLaunchTimeoutError(error);
      if (!canRetry) {
        throw error;
      }
      await sleep(CI_PLAYWRIGHT_LAUNCH_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

export async function launchPlaywrightBrowser(
  options: LaunchOptions = {},
): Promise<Browser> {
  const launchOptions = resolveLaunchOptions(options);
  if (!shouldSerializePlaywrightLaunch()) {
    return chromium.launch(launchOptions);
  }

  return launchChromiumWithCiRetries(launchOptions);
}
