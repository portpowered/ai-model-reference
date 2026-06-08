import { type Browser, chromium, type LaunchOptions } from "playwright";

const CI_PLAYWRIGHT_LAUNCH_TIMEOUT_MS = 300_000;

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

/**
 * Launches Chromium for export/integration verifiers. Under CI, launches are
 * serialized within a test worker so concurrent tests in the same file do not
 * stampede browser startup.
 */
export async function launchPlaywrightBrowser(
  options: LaunchOptions = {},
): Promise<Browser> {
  const launchOptions = resolveLaunchOptions(options);
  if (!shouldSerializePlaywrightLaunch()) {
    return chromium.launch(launchOptions);
  }

  const waitForPriorLaunch = inProcessLaunchGate;
  let releaseInProcessGate!: () => void;
  inProcessLaunchGate = new Promise<void>((resolve) => {
    releaseInProcessGate = resolve;
  });

  await waitForPriorLaunch;
  try {
    return await chromium.launch(launchOptions);
  } finally {
    releaseInProcessGate();
  }
}
