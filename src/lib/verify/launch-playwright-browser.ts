import { closeSync, constants, mkdirSync, openSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, chromium, type LaunchOptions } from "playwright";

const CI_PLAYWRIGHT_LAUNCH_TIMEOUT_MS = 300_000;
const MAX_CONCURRENT_CI_LAUNCHES = 2;
const LAUNCH_SLOT_DIR = join(tmpdir(), "model-atlas-playwright-launch-slots");
const LOCK_POLL_MS = 200;

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

function tryAcquireLaunchSlot(): (() => void) | null {
  mkdirSync(LAUNCH_SLOT_DIR, { recursive: true });

  for (let slotId = 0; slotId < MAX_CONCURRENT_CI_LAUNCHES; slotId += 1) {
    const slotPath = launchSlotPath(slotId);
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
export async function launchPlaywrightBrowser(
  options: LaunchOptions = {},
): Promise<Browser> {
  const launchOptions = resolveLaunchOptions(options);
  if (!shouldSerializePlaywrightLaunch()) {
    return chromium.launch(launchOptions);
  }

  return withCiLaunchSerialization(() => chromium.launch(launchOptions));
}
