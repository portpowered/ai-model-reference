import type { Browser, Locator, Page } from "playwright";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

/** Phase 1 manual-gate queries exercised in the header search dialog. */
export const PHASE_1_SEARCH_DIALOG_QUERIES = PHASE_1_SEARCH_PAGE_QUERIES;

export type Phase1SearchDialogQuery =
  (typeof PHASE_1_SEARCH_DIALOG_QUERIES)[number];

export type Phase1SearchDialogCheckFailure = {
  query: string;
  surface: "header-dialog";
  reason: string;
};

export type SearchDialogDomSnapshot = {
  hasResults: boolean;
  hasEmpty: boolean;
  hasGroupedQueryAttentionLink: boolean;
  hasGroupedQueryAttentionResultUrl: boolean;
  hasGroupedQueryAttentionButton: boolean;
};

export const VERIFY_SEARCH_DIALOG_STUB_ENV = "VERIFY_SEARCH_DIALOG_STUB";

export type RunPhase1SearchDialogChecksOptions = {
  timeoutMs?: number;
  queries?: readonly string[];
  launchBrowser?: () => Promise<Browser>;
  /**
   * Test hook: when set, skips Playwright and runs this checker per query instead.
   */
  runQueryCheck?: (
    baseUrl: string,
    query: string,
    timeoutMs: number,
  ) => Promise<string | null>;
};

/**
 * Test-only stub hook: VERIFY_SEARCH_DIALOG_STUB=pass skips Playwright when the
 * base URL is a static HTTP fixture (see verify-phase-1-ux-verifier script test).
 */
export function resolveSearchDialogCheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RunPhase1SearchDialogChecksOptions {
  const stub = env[VERIFY_SEARCH_DIALOG_STUB_ENV]?.trim();
  if (stub === "pass") {
    return { runQueryCheck: async () => null };
  }
  return {};
}

const SEARCH_DIALOG_TRIGGER_SELECTOR = "button[data-search]";
const SEARCH_DIALOG_EMPTY_SELECTOR = '[data-testid="search-dialog-empty"]';
const SEARCH_DIALOG_LOADING_SELECTOR = '[data-testid="search-dialog-loading"]';
const SEARCH_RESULT_URL_SELECTOR = '[data-testid="search-result-url"]';
const SEARCH_DIALOG_OPEN_RETRY_INTERVAL_MS = 250;
const SEARCH_DIALOG_QUERY_RETRY_DELAY_MS = 250;

/** Default per-query browser deadline (static-export dialog hydration can exceed 30s under CI load). */
export const DEFAULT_SEARCH_DIALOG_TIMEOUT_MS = 45_000;

export function formatPhase1SearchDialogCheckFailure(
  failure: Phase1SearchDialogCheckFailure,
): string {
  return `${failure.surface}?query=${encodeURIComponent(failure.query)}: ${failure.reason}`;
}

/**
 * Pure DOM outcome for the header search dialog — used by Playwright and unit tests.
 */
export function evaluateSearchDialogDomSnapshot(
  snapshot: SearchDialogDomSnapshot,
  query: string,
): string | null {
  if (snapshot.hasEmpty && !snapshot.hasResults) {
    return `empty results state in header search dialog for query "${query}" — expected visible result for ${PHASE_1_GROUPED_QUERY_ATTENTION_URL}`;
  }

  if (!snapshot.hasResults) {
    return `no search results rendered in header search dialog for query "${query}"`;
  }

  if (
    snapshot.hasGroupedQueryAttentionLink ||
    snapshot.hasGroupedQueryAttentionResultUrl ||
    snapshot.hasGroupedQueryAttentionButton
  ) {
    return null;
  }

  return `no visible link to ${PHASE_1_GROUPED_QUERY_ATTENTION_URL} in header search dialog results for query "${query}"`;
}

export async function readSearchDialogDomSnapshot(
  dialog: Locator,
): Promise<SearchDialogDomSnapshot> {
  const moduleUrl = PHASE_1_GROUPED_QUERY_ATTENTION_URL;

  const resultUrlCount = await dialog
    .locator(SEARCH_RESULT_URL_SELECTOR)
    .count();
  const hasResults = resultUrlCount > 0;
  const hasEmpty = await dialog
    .locator(SEARCH_DIALOG_EMPTY_SELECTOR)
    .isVisible();

  const linkCount = await dialog.locator(`a[href="${moduleUrl}"]`).count();
  const hasGroupedQueryAttentionLink = linkCount > 0;

  const urlNodes = dialog.locator(SEARCH_RESULT_URL_SELECTOR);
  const urlNodeCount = await urlNodes.count();
  let hasGroupedQueryAttentionResultUrl = false;
  for (let index = 0; index < urlNodeCount; index += 1) {
    const text = await urlNodes.nth(index).textContent();
    if (text?.includes(moduleUrl)) {
      hasGroupedQueryAttentionResultUrl = true;
      break;
    }
  }

  const buttonCount = await dialog
    .getByRole("button", { name: /Grouped-Query.*Attention/i })
    .count();
  const hasGroupedQueryAttentionButton = buttonCount > 0;

  return {
    hasResults,
    hasEmpty,
    hasGroupedQueryAttentionLink,
    hasGroupedQueryAttentionResultUrl,
    hasGroupedQueryAttentionButton,
  };
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableSearchDialogTriggerError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("element was detached from the dom") ||
    message.includes("element is not attached to the dom") ||
    message.includes("waiting for locator")
  );
}

async function openHeaderSearchDialog(
  page: Page,
  baseUrl: string,
  timeoutMs: number,
): Promise<Locator> {
  const homeUrl = normalizeVerifyBaseUrl(baseUrl);
  await page.goto(homeUrl, {
    timeout: timeoutMs,
    waitUntil: "domcontentloaded",
  });

  const dialog = page.getByRole("dialog", { name: "Search" });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await dialog.isVisible().catch(() => false)) {
      return dialog;
    }

    const remainingMs = Math.max(1, deadline - Date.now());
    const trigger = page.locator(SEARCH_DIALOG_TRIGGER_SELECTOR).first();

    try {
      await trigger.waitFor({
        state: "visible",
        timeout: Math.min(1_000, remainingMs),
      });
      await trigger.click({ timeout: Math.min(remainingMs, timeoutMs) });
    } catch (error) {
      if (!isRetryableSearchDialogTriggerError(error)) {
        throw error;
      }

      await sleep(Math.min(SEARCH_DIALOG_OPEN_RETRY_INTERVAL_MS, remainingMs));
      continue;
    }

    try {
      await dialog.waitFor({
        state: "visible",
        timeout: Math.min(1_000, remainingMs),
      });
      return dialog;
    } catch {
      await sleep(Math.min(SEARCH_DIALOG_OPEN_RETRY_INTERVAL_MS, remainingMs));
    }
  }

  await dialog.waitFor({ state: "visible", timeout: 1 });
  return dialog;
}

async function waitForSearchDialogOutcome(
  dialog: Locator,
  timeoutMs: number,
): Promise<void> {
  const loading = dialog.locator(SEARCH_DIALOG_LOADING_SELECTOR);
  const results = dialog.locator(SEARCH_RESULT_URL_SELECTOR);
  const empty = dialog.locator(SEARCH_DIALOG_EMPTY_SELECTOR);

  await Promise.race([
    loading.waitFor({ state: "visible", timeout: timeoutMs }),
    results.first().waitFor({ state: "visible", timeout: timeoutMs }),
    empty.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);

  await Promise.race([
    results.first().waitFor({ state: "visible", timeout: timeoutMs }),
    empty.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);
}

/**
 * Opens the header search dialog, runs a query, and returns a failure reason,
 * or null when the grouped-query-attention result is visible.
 */
export async function checkSearchDialogQuery(
  page: Page,
  baseUrl: string,
  query: string,
  timeoutMs: number = DEFAULT_SEARCH_DIALOG_TIMEOUT_MS,
  dialog?: Locator,
): Promise<string | null> {
  const activeDialog =
    dialog ?? (await openHeaderSearchDialog(page, baseUrl, timeoutMs));

  const input = activeDialog.getByRole("textbox");
  const deadline = Date.now() + timeoutMs;
  let lastReason: string | null = null;

  for (let attempt = 0; Date.now() < deadline; attempt += 1) {
    const remainingMs = Math.max(1, deadline - Date.now());
    await input.focus();
    await input.fill("");
    await input.pressSequentially(query, { delay: 30 });

    try {
      await waitForSearchDialogOutcome(activeDialog, remainingMs);
    } catch {
      lastReason = `timed out waiting for search results in header search dialog for query "${query}" after ${timeoutMs}ms`;
    }

    const snapshot = await readSearchDialogDomSnapshot(activeDialog);
    const reason = evaluateSearchDialogDomSnapshot(snapshot, query);
    if (reason === null) {
      return null;
    }

    lastReason = reason;
    if (attempt > 0 || snapshot.hasResults || snapshot.hasEmpty) {
      return reason;
    }

    await sleep(
      Math.min(
        SEARCH_DIALOG_QUERY_RETRY_DELAY_MS,
        Math.max(1, deadline - Date.now()),
      ),
    );
  }

  return (
    lastReason ??
    `timed out waiting for search results in header search dialog for query "${query}" after ${timeoutMs}ms`
  );
}

/**
 * Runs Playwright checks for each Phase 1 header dialog query; returns failures.
 */
export async function runPhase1SearchDialogChecks(
  baseUrl: string,
  options: RunPhase1SearchDialogChecksOptions = {},
): Promise<Phase1SearchDialogCheckFailure[]> {
  const queries = options.queries ?? PHASE_1_SEARCH_DIALOG_QUERIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SEARCH_DIALOG_TIMEOUT_MS;
  const failures: Phase1SearchDialogCheckFailure[] = [];

  if (options.runQueryCheck) {
    for (const query of queries) {
      const reason = await options.runQueryCheck(baseUrl, query, timeoutMs);
      if (reason) {
        failures.push({ query, surface: "header-dialog", reason });
      }
    }
    return failures;
  }

  const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);

    const dialog = await openHeaderSearchDialog(page, baseUrl, timeoutMs);

    for (const query of queries) {
      const reason = await checkSearchDialogQuery(
        page,
        baseUrl,
        query,
        timeoutMs,
        dialog,
      );
      if (reason) {
        failures.push({ query, surface: "header-dialog", reason });
      }
    }
  } finally {
    await closePlaywrightBrowserWithTimeout(browser, timeoutMs);
  }

  return failures;
}

/**
 * Runs header search dialog checks, prints each failure, and throws when any fail.
 */
export async function assertPhase1SearchDialog(
  baseUrl: string,
  options: RunPhase1SearchDialogChecksOptions = {},
): Promise<void> {
  const failures = await runPhase1SearchDialogChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  for (const failure of failures) {
    console.error(formatPhase1SearchDialogCheckFailure(failure));
  }

  throw new Error(
    `Phase 1 header search dialog verification failed (${failures.length} query/queries)`,
  );
}
