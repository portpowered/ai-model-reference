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

export type SearchDialogInputHydrationSnapshot = {
  inputVisible: boolean;
  inputFocused: boolean;
  inputValue: string;
  idleVisible: boolean;
  loadingVisible: boolean;
  resultsVisible: boolean;
  emptyVisible: boolean;
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
const SEARCH_DIALOG_IDLE_SELECTOR = '[data-testid="search-dialog-idle"]';
const SEARCH_DIALOG_LOADING_SELECTOR = '[data-testid="search-dialog-loading"]';
const SEARCH_DIALOG_EMPTY_SELECTOR = '[data-testid="search-dialog-empty"]';
const SEARCH_RESULT_URL_SELECTOR = '[data-testid="search-result-url"]';
const SEARCH_DIALOG_OPEN_RETRY_INTERVAL_MS = 250;
const SEARCH_INPUT_SNAPSHOT_FIELD_TIMEOUT_MS = 5_000;

/** Default per-query browser deadline (client hydration can exceed 10s under CI load). */
export const DEFAULT_SEARCH_DIALOG_TIMEOUT_MS = 30_000;

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

async function readBoundedInputValue(input: Locator): Promise<string> {
  try {
    return await input.inputValue({
      timeout: SEARCH_INPUT_SNAPSHOT_FIELD_TIMEOUT_MS,
    });
  } catch {
    return "";
  }
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

  const trigger = page.locator(SEARCH_DIALOG_TRIGGER_SELECTOR).first();
  const dialog = page.getByRole("dialog", { name: "Search" });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await dialog.isVisible().catch(() => false)) {
      return dialog;
    }

    const remainingMs = Math.max(1, deadline - Date.now());
    await trigger.click({ timeout: Math.min(remainingMs, timeoutMs) });

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

export async function readSearchDialogInputHydrationSnapshot(
  dialog: Locator,
): Promise<SearchDialogInputHydrationSnapshot> {
  const input = dialog.getByRole("textbox");

  return {
    inputVisible: await input.isVisible(),
    inputFocused: await input
      .evaluate((element) => element === document.activeElement)
      .catch(() => false),
    inputValue: await readBoundedInputValue(input),
    idleVisible: await dialog.locator(SEARCH_DIALOG_IDLE_SELECTOR).isVisible(),
    loadingVisible: await dialog
      .locator(SEARCH_DIALOG_LOADING_SELECTOR)
      .isVisible(),
    resultsVisible:
      (await dialog.locator(SEARCH_RESULT_URL_SELECTOR).count()) > 0,
    emptyVisible: await dialog
      .locator(SEARCH_DIALOG_EMPTY_SELECTOR)
      .isVisible(),
  };
}

export function evaluateSearchDialogInputHydrationBeforeQuery(
  snapshot: SearchDialogInputHydrationSnapshot,
): string | null {
  if (!snapshot.inputVisible) {
    return "search input is not visible in header search dialog";
  }

  if (!snapshot.idleVisible) {
    return "idle state is not visible before query entry in header search dialog";
  }

  return null;
}

export function evaluateSearchDialogInputHydrationAfterTyping(
  snapshot: SearchDialogInputHydrationSnapshot,
  typedQuery: string,
): string | null {
  if (!snapshot.inputFocused) {
    return "search input did not retain focus after typing in header search dialog";
  }

  if (snapshot.inputValue !== typedQuery) {
    return `search input value "${snapshot.inputValue}" did not update to "${typedQuery}" after typing in header search dialog`;
  }

  if (snapshot.idleVisible) {
    return "idle state remained visible after entering a query in header search dialog";
  }

  return null;
}

export function evaluateSearchDialogInputHydrationOutcome(
  snapshot: SearchDialogInputHydrationSnapshot,
): string | null {
  if (
    snapshot.loadingVisible ||
    snapshot.resultsVisible ||
    snapshot.emptyVisible
  ) {
    return null;
  }

  return "no loading, results, or empty outcome appeared after entering a query in header search dialog";
}

async function waitForSearchDialogInputHydrationBeforeQuery(
  dialog: Locator,
  timeoutMs: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const snapshot = await readSearchDialogInputHydrationSnapshot(dialog);
      const failure = evaluateSearchDialogInputHydrationBeforeQuery(snapshot);
      if (!failure) {
        return null;
      }
    } catch {
      // React hydration can detach the input between visibility and evaluate.
    }

    await sleep(250);
  }

  return `search input did not hydrate in header search dialog within ${timeoutMs}ms`;
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

  const beforeQuery = await waitForSearchDialogInputHydrationBeforeQuery(
    activeDialog,
    timeoutMs,
  );
  if (beforeQuery) {
    return beforeQuery;
  }

  const input = activeDialog.getByRole("textbox");
  await input.fill("");
  await input.focus();
  await input.pressSequentially(query, { delay: 30 });

  const afterTyping = evaluateSearchDialogInputHydrationAfterTyping(
    await readSearchDialogInputHydrationSnapshot(activeDialog),
    query,
  );
  if (afterTyping) {
    return afterTyping;
  }

  try {
    await waitForSearchDialogOutcome(activeDialog, timeoutMs);
  } catch {
    return `timed out waiting for search results in header search dialog for query "${query}" after ${timeoutMs}ms`;
  }

  const hydrationOutcome = evaluateSearchDialogInputHydrationOutcome(
    await readSearchDialogInputHydrationSnapshot(activeDialog),
  );
  if (hydrationOutcome) {
    return hydrationOutcome;
  }

  const snapshot = await readSearchDialogDomSnapshot(activeDialog);
  return evaluateSearchDialogDomSnapshot(snapshot, query);
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
