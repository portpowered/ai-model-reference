import type { Browser, Page } from "playwright";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskHomeHeaderRows,
  HOME_HEADER_CUSTOMER_ASK_CHECKS,
  HOME_HEADER_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-home-header-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskHomeHeaderChecksOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
  /**
   * Test hook: when set, runs this probe instead of the default Playwright
   * affordance check when static HTML cannot assert readable shortcut chips.
   */
  runCommandKAffordanceProbe?: (
    baseUrl: string,
    timeoutMs: number,
  ) => Promise<string | null>;
};

function buildHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  const failRow = (
    check: (typeof HOME_HEADER_CUSTOMER_ASK_CHECKS)[keyof typeof HOME_HEADER_CUSTOMER_ASK_CHECKS],
  ): CustomerAskConvergenceRow => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route: HOME_HEADER_CUSTOMER_ASK_ROUTE,
    reason,
    checklistRow: "phase-1-home-header-polish",
  });

  return [
    failRow(HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry),
    failRow(HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch),
    failRow(HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance),
    {
      checkId: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
      title: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.title,
      status: "uncertain",
      route: HOME_HEADER_CUSTOMER_ASK_ROUTE,
      reason: "home HTML unavailable for hover contrast assertion",
      checklistRow: "phase-1-home-header-polish",
    },
  ];
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

/**
 * Minimal Playwright probe: header search trigger exposes a visible kbd chip.
 */
export async function probeCommandKAffordanceReadable(
  page: Page,
  baseUrl: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<string | null> {
  await page.goto(normalizeVerifyBaseUrl(baseUrl), {
    timeout: timeoutMs,
    waitUntil: "domcontentloaded",
  });

  const trigger = page.locator("[data-search]").first();
  const triggerVisible = await trigger.isVisible().catch(() => false);
  if (!triggerVisible) {
    return "header search trigger (data-search) not visible";
  }

  const kbd = trigger.locator("kbd").first();
  const kbdVisible = await kbd.isVisible().catch(() => false);
  if (!kbdVisible) {
    return "header search trigger missing visible kbd shortcut chips";
  }

  const text = (await kbd.innerText().catch(() => "")).trim();
  if (text.length === 0) {
    return "header search trigger kbd shortcut text is empty";
  }

  return null;
}

async function runDefaultCommandKAffordanceProbe(
  baseUrl: string,
  timeoutMs: number,
  launchBrowser: () => Promise<Browser>,
): Promise<string | null> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    return await probeCommandKAffordanceReadable(page, baseUrl, timeoutMs);
  } finally {
    await browser.close();
  }
}

function applyCommandKAffordanceProbeResult(
  rows: CustomerAskConvergenceRow[],
  probeReason: string | null,
): CustomerAskConvergenceRow[] {
  if (probeReason) {
    return rows;
  }

  return rows.map((row) =>
    row.checkId === HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance.checkId
      ? { ...row, status: "pass", reason: undefined }
      : row,
  );
}

/**
 * Fetches built `/` HTML and returns customer-ask home/header convergence rows.
 * When static HTML cannot assert Command-K readability, optionally runs a minimal
 * Playwright probe before marking the affordance check as fail.
 */
export async function runCustomerAskHomeHeaderChecks(
  baseUrl: string,
  options: RunCustomerAskHomeHeaderChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${HOME_HEADER_CUSTOMER_ASK_ROUTE}`;

  let html: string;
  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return buildHttpFailureRows(`expected HTTP 200, received HTTP ${status}`);
    }
    html = body;
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return buildHttpFailureRows(reason);
  }

  const rows = buildCustomerAskHomeHeaderRows(html);
  const affordanceRow = rows.find(
    (row) =>
      row.checkId ===
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance.checkId,
  );

  if (affordanceRow?.status !== "fail") {
    return rows;
  }

  const runProbe =
    options.runCommandKAffordanceProbe ??
    (async (probeBaseUrl, probeTimeoutMs) =>
      runDefaultCommandKAffordanceProbe(
        probeBaseUrl,
        probeTimeoutMs,
        options.launchBrowser ?? defaultLaunchBrowser,
      ));

  const probeReason = await runProbe(baseUrl, timeoutMs);
  return applyCommandKAffordanceProbeResult(rows, probeReason);
}
