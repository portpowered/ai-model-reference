import { type Browser, chromium, type LaunchOptions } from "playwright";

let inProcessLaunchGate: Promise<void> = Promise.resolve();

function shouldSerializePlaywrightLaunch(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

/**
 * Launches Chromium for export/integration verifiers. Under CI, launches are
 * serialized within a test worker so concurrent tests in the same file do not
 * stampede browser startup.
 */
export async function launchPlaywrightBrowser(
  options: LaunchOptions = {},
): Promise<Browser> {
  if (!shouldSerializePlaywrightLaunch()) {
    return chromium.launch({ headless: true, ...options });
  }

  const waitForPriorLaunch = inProcessLaunchGate;
  let releaseInProcessGate!: () => void;
  inProcessLaunchGate = new Promise<void>((resolve) => {
    releaseInProcessGate = resolve;
  });

  await waitForPriorLaunch;
  try {
    return await chromium.launch({ headless: true, ...options });
  } finally {
    releaseInProcessGate();
  }
}
