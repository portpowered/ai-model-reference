import type { Browser, Page } from "playwright";
import {
  BATCH_012_HEADER_BAR_CHECKLIST_ROW,
  BATCH_012_MOBILE_HEADER_CHECKS,
  BATCH_012_MOBILE_HEADER_ROUTE,
} from "./batch-012-mobile-header-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskMobileHeaderRow,
  MOBILE_HEADER_CUSTOMER_ASK_REASONS,
} from "./customer-ask-mobile-header-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const MOBILE_HEADER_VIEWPORT = {
  width: 390,
  height: 844,
} as const;

export type RunCustomerAskMobileHeaderChecksOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
  /**
   * Test hook: when set, runs this probe instead of the default Playwright
   * mobile-viewport affordance check after static HTML is fetched.
   */
  runMobileHeaderViewportProbe?: (
    baseUrl: string,
    timeoutMs: number,
  ) => Promise<string | null>;
};

function buildHttpFailureRow(reason: string): CustomerAskConvergenceRow {
  const check = BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu;
  return {
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route: BATCH_012_MOBILE_HEADER_ROUTE,
    reason,
    checklistRow: BATCH_012_HEADER_BAR_CHECKLIST_ROW,
  };
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

/**
 * Minimal Playwright probe: at a mobile viewport the header exposes a visible
 * disclosure menu control and hides inline desktop primary navigation links.
 */
export async function probeMobileHeaderAtViewport(
  page: Page,
  baseUrl: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<string | null> {
  await page.setViewportSize(MOBILE_HEADER_VIEWPORT);
  await page.goto(normalizeVerifyBaseUrl(baseUrl), {
    timeout: timeoutMs,
    waitUntil: "domcontentloaded",
  });

  const menuButton = page
    .locator("header button[aria-controls][aria-expanded]")
    .first();
  const menuVisible = await menuButton.isVisible().catch(() => false);
  if (!menuVisible) {
    return MOBILE_HEADER_CUSTOMER_ASK_REASONS.missingMobileMenuButton;
  }

  const desktopNav = page.locator('header nav[aria-label="Primary"]').first();
  const desktopNavVisible = await desktopNav.isVisible().catch(() => false);
  if (desktopNavVisible) {
    const desktopLinkCount = await desktopNav.locator("a").count();
    if (desktopLinkCount >= 2) {
      return MOBILE_HEADER_CUSTOMER_ASK_REASONS.inlineFullNavVisible;
    }
  }

  return null;
}

async function runDefaultMobileHeaderViewportProbe(
  baseUrl: string,
  timeoutMs: number,
  launchBrowser: () => Promise<Browser>,
): Promise<string | null> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    return await probeMobileHeaderAtViewport(page, baseUrl, timeoutMs);
  } finally {
    await browser.close();
  }
}

function applyMobileHeaderViewportProbeResult(
  row: CustomerAskConvergenceRow,
  probeReason: string | null,
): CustomerAskConvergenceRow {
  if (probeReason) {
    return {
      ...row,
      status: "fail",
      reason: probeReason,
    };
  }

  if (row.status === "uncertain") {
    return {
      ...row,
      status: "pass",
      reason: undefined,
    };
  }

  return row;
}

/**
 * Fetches built `/` HTML at a mobile viewport and returns the batch-012 mobile
 * header hamburger customer-ask convergence row.
 */
export async function runCustomerAskMobileHeaderChecks(
  baseUrl: string,
  options: RunCustomerAskMobileHeaderChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${BATCH_012_MOBILE_HEADER_ROUTE}`;

  let html: string;
  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return [
        buildHttpFailureRow(`expected HTTP 200, received HTTP ${status}`),
      ];
    }
    html = body;
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return [buildHttpFailureRow(reason)];
  }

  const row = buildCustomerAskMobileHeaderRow(html);
  if (row.status === "fail") {
    return [row];
  }

  const runProbe =
    options.runMobileHeaderViewportProbe ??
    (async (probeBaseUrl, probeTimeoutMs) =>
      runDefaultMobileHeaderViewportProbe(
        probeBaseUrl,
        probeTimeoutMs,
        options.launchBrowser ?? defaultLaunchBrowser,
      ));

  const probeReason = await runProbe(baseUrl, timeoutMs);
  return [applyMobileHeaderViewportProbeResult(row, probeReason)];
}
