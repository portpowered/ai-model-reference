import { type Browser, chromium, type LaunchOptions } from "playwright";

let launchGate: Promise<void> = Promise.resolve();

function shouldSerializePlaywrightLaunch(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

/**
 * Launches Chromium for export/integration verifiers. Under CI, launches are
 * serialized so parallel `bun test` files do not stampede browser startup.
 */
export async function launchPlaywrightBrowser(
  options: LaunchOptions = {},
): Promise<Browser> {
  if (!shouldSerializePlaywrightLaunch()) {
    return chromium.launch({ headless: true, ...options });
  }

  const waitForPriorLaunch = launchGate;
  let releaseLaunchGate!: () => void;
  launchGate = new Promise<void>((resolve) => {
    releaseLaunchGate = resolve;
  });

  await waitForPriorLaunch;
  try {
    return await chromium.launch({ headless: true, ...options });
  } finally {
    releaseLaunchGate();
  }
}
