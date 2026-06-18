import {
  closeSync,
  constants,
  existsSync,
  mkdirSync,
  openSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, chromium, type LaunchOptions } from "playwright";
import { isInsideExportIntegrationProbeLock } from "./export-integration-probe-lock";

const CI_PLAYWRIGHT_LAUNCH_TIMEOUT_MS = 120_000;
/** Avoid hanging the full Bun probe timeout when browser teardown stalls under CI load. */
export const PLAYWRIGHT_BROWSER_CLOSE_TIMEOUT_MS = 15_000;
const CI_PLAYWRIGHT_LAUNCH_ATTEMPTS = 5;
const CI_PLAYWRIGHT_LAUNCH_RETRY_DELAY_MS = 5_000;
const CI_PLAYWRIGHT_LAUNCH_INITIAL_DELAY_MS = 3_000;
const MAX_CONCURRENT_CI_LAUNCHES = 1;
const LAUNCH_SLOT_DIR = join(tmpdir(), "model-atlas-playwright-launch-slots");
const SYSTEM_CHROME_EXECUTABLE_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOCK_POLL_MS = 200;
/** Drop launch slots left behind by crashed workers so waiters do not poll until Bun timeout. */
const STALE_LAUNCH_SLOT_MAX_AGE_MS = 5 * 60 * 1000;
export const PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH_ENV =
  "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH";

let inProcessLaunchGate: Promise<void> = Promise.resolve();

function shouldSerializePlaywrightLaunch(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

function shouldAcquireCrossProcessLaunchSlot(): boolean {
  return (
    shouldSerializePlaywrightLaunch() && !isInsideExportIntegrationProbeLock()
  );
}

export function resolvePlaywrightChromiumExecutablePath({
  env = process.env,
  bundledExecutablePath = chromium.executablePath(),
  systemChromePath = SYSTEM_CHROME_EXECUTABLE_PATH,
}: {
  env?: Record<string, string | undefined>;
  bundledExecutablePath?: string;
  systemChromePath?: string;
} = {}): string | undefined {
  const override = env[PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH_ENV]?.trim();
  if (override) {
    return override;
  }

  if (existsSync(bundledExecutablePath)) {
    return undefined;
  }

  if (existsSync(systemChromePath)) {
    return systemChromePath;
  }

  return undefined;
}

function resolveLaunchOptions(options: LaunchOptions): LaunchOptions {
  const executablePath =
    options.executablePath ?? resolvePlaywrightChromiumExecutablePath();

  if (!shouldSerializePlaywrightLaunch()) {
    return { headless: true, ...options, executablePath };
  }

  return {
    headless: true,
    timeout: options.timeout ?? CI_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
    ...options,
    executablePath,
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

export function isPlaywrightLaunchRetryableError(error: unknown): boolean {
  if (isPlaywrightLaunchTimeoutError(error)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const errno =
    "errno" in error && typeof error.errno === "number" ? error.errno : null;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : null;

  return (
    error.message.includes("Failed to connect") ||
    code === "ENOENT" ||
    code === "ECONNREFUSED" ||
    errno === -2
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
  const releaseLaunchSlot = shouldAcquireCrossProcessLaunchSlot()
    ? await acquireLaunchSlot()
    : null;
  try {
    return await launch();
  } finally {
    releaseLaunchSlot?.();
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
  if (shouldSerializePlaywrightLaunch()) {
    await sleep(CI_PLAYWRIGHT_LAUNCH_INITIAL_DELAY_MS);
  }
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
        isPlaywrightLaunchRetryableError(error);
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

/**
 * Closes a Playwright browser without letting teardown stall until the Bun
 * integration probe timeout when Chromium is slow to exit under CI load.
 */
export async function closePlaywrightBrowserWithTimeout(
  browser: Browser,
  timeoutMs: number = PLAYWRIGHT_BROWSER_CLOSE_TIMEOUT_MS,
): Promise<void> {
  await Promise.race([browser.close(), sleep(timeoutMs)]);
}
