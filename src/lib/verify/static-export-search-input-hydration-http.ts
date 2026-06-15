import type { Browser, Locator, Page } from "playwright";
import { withExportIntegrationProbeLock } from "./export-integration-probe-lock";
import { httpGetText } from "./http-harness";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";
import { assertSearchPageExportShell } from "./phase-1-search-export-shell-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const DEFAULT_SEARCH_INPUT_HYDRATION_TIMEOUT_MS = 30_000;

export const SEARCH_PAGE_INPUT_SELECTOR = "#search-page-input";
export const SEARCH_PAGE_IDLE_SELECTOR = '[data-testid="search-page-idle"]';
export const SEARCH_PAGE_LOADING_SELECTOR =
  '[data-testid="search-page-loading"]';
export const SEARCH_PAGE_RESULTS_SELECTOR =
  '[data-testid="search-page-results"]';
export const SEARCH_PAGE_EMPTY_SELECTOR = '[data-testid="search-page-empty"]';

export const DEFAULT_SEARCH_INPUT_HYDRATION_QUERY = "GQA";

const SEARCH_INPUT_SNAPSHOT_FIELD_TIMEOUT_MS = 5_000;

export type SearchPageInputHydrationSnapshot = {
  inputVisible: boolean;
  inputFocused: boolean;
  inputValue: string;
  idleVisible: boolean;
  loadingVisible: boolean;
  resultsVisible: boolean;
  emptyVisible: boolean;
};

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readSearchPageInputHydrationSnapshot(
  page: Page,
): Promise<SearchPageInputHydrationSnapshot> {
  const input = page.locator(SEARCH_PAGE_INPUT_SELECTOR);

  return {
    inputVisible: await input.isVisible(),
    inputFocused: await input
      .evaluate((element) => element === document.activeElement)
      .catch(() => false),
    inputValue: await readBoundedInputValue(input),
    idleVisible: await page.locator(SEARCH_PAGE_IDLE_SELECTOR).isVisible(),
    loadingVisible: await page
      .locator(SEARCH_PAGE_LOADING_SELECTOR)
      .isVisible(),
    resultsVisible: await page
      .locator(SEARCH_PAGE_RESULTS_SELECTOR)
      .isVisible(),
    emptyVisible: await page.locator(SEARCH_PAGE_EMPTY_SELECTOR).isVisible(),
  };
}

/**
 * Polls until `/search` exposes an operable input and idle shell before typing.
 */
export async function waitForSearchPageInputHydrationBeforeQuery(
  page: Page,
  timeoutMs: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const snapshot = await readSearchPageInputHydrationSnapshot(page);
      const failure = evaluateSearchPageInputHydrationBeforeQuery(snapshot);
      if (!failure) {
        return null;
      }
    } catch {
      // React hydration can detach the input between visibility and evaluate.
    }

    await sleep(250);
  }

  return `search input did not hydrate on /search within ${timeoutMs}ms`;
}

/**
 * Pure pre-query hydration outcome for `/search` — used by Playwright and unit tests.
 */
export function evaluateSearchPageInputHydrationBeforeQuery(
  snapshot: SearchPageInputHydrationSnapshot,
): string | null {
  if (!snapshot.inputVisible) {
    return "search input is not visible on /search";
  }

  if (!snapshot.idleVisible) {
    return "idle state is not visible before query entry on /search";
  }

  return null;
}

/**
 * Pure post-typing hydration outcome for `/search` — used by Playwright and unit tests.
 */
export function evaluateSearchPageInputHydrationAfterTyping(
  snapshot: SearchPageInputHydrationSnapshot,
  typedQuery: string,
): string | null {
  if (!snapshot.inputFocused) {
    return "search input did not retain focus after typing on /search";
  }

  if (snapshot.inputValue !== typedQuery) {
    return `search input value "${snapshot.inputValue}" did not update to "${typedQuery}" after typing on /search`;
  }

  if (snapshot.idleVisible) {
    return "idle state remained visible after entering a query on /search";
  }

  return null;
}

/**
 * Pure search-outcome hydration check after a non-empty query on `/search`.
 */
export function evaluateSearchPageInputHydrationOutcome(
  snapshot: SearchPageInputHydrationSnapshot,
): string | null {
  if (
    snapshot.loadingVisible ||
    snapshot.resultsVisible ||
    snapshot.emptyVisible
  ) {
    return null;
  }

  return "no loading, results, or empty outcome appeared after entering a query on /search";
}

async function waitForSearchPageInputHydrationOutcome(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const loading = page.locator(SEARCH_PAGE_LOADING_SELECTOR);
  const results = page.locator(SEARCH_PAGE_RESULTS_SELECTOR);
  const empty = page.locator(SEARCH_PAGE_EMPTY_SELECTOR);

  await Promise.race([
    loading.waitFor({ state: "visible", timeout: timeoutMs }),
    results.waitFor({ state: "visible", timeout: timeoutMs }),
    empty.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);
}

async function verifySearchPageInputHydrationOnPage(
  page: Page,
  baseUrl: string,
  query: string,
  timeoutMs: number,
): Promise<string | null> {
  const searchUrl = `${normalizeVerifyBaseUrl(baseUrl)}/search`;
  await page.goto(searchUrl, {
    timeout: timeoutMs,
    waitUntil: "load",
  });

  const beforeQuery = await waitForSearchPageInputHydrationBeforeQuery(
    page,
    timeoutMs,
  );
  if (beforeQuery) {
    return beforeQuery;
  }

  const input = page.locator(SEARCH_PAGE_INPUT_SELECTOR);

  await input.focus();
  await input.pressSequentially(query, { delay: 30 });

  const afterTyping = evaluateSearchPageInputHydrationAfterTyping(
    await readSearchPageInputHydrationSnapshot(page),
    query,
  );
  if (afterTyping) {
    return afterTyping;
  }

  try {
    await waitForSearchPageInputHydrationOutcome(page, timeoutMs);
  } catch {
    return `timed out waiting for search loading or outcome on /search for query "${query}" after ${timeoutMs}ms`;
  }

  return evaluateSearchPageInputHydrationOutcome(
    await readSearchPageInputHydrationSnapshot(page),
  );
}

/**
 * Verifies the exported `/search` page hydrates an operable input that accepts
 * typed queries and transitions out of the idle state on a static export server.
 */
export async function verifyStaticExportSearchInputHydration(
  baseUrl: string,
  options: {
    timeoutMs?: number;
    query?: string;
    launchBrowser?: () => Promise<Browser>;
  } = {},
): Promise<string | null> {
  return withExportIntegrationProbeLock(async () => {
    const timeoutMs =
      options.timeoutMs ?? DEFAULT_SEARCH_INPUT_HYDRATION_TIMEOUT_MS;
    const query = options.query ?? DEFAULT_SEARCH_INPUT_HYDRATION_QUERY;
    const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
    const searchUrl = `${normalizeVerifyBaseUrl(baseUrl)}/search`;

    const htmlResponse = await httpGetText(searchUrl, timeoutMs);
    if (htmlResponse.status < 200 || htmlResponse.status >= 300) {
      return `/search export route returned HTTP ${htmlResponse.status}.`;
    }

    const shellFailure = assertSearchPageExportShell(htmlResponse.body);
    if (shellFailure) {
      return shellFailure;
    }

    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(timeoutMs);
      page.setDefaultNavigationTimeout(timeoutMs);
      return await verifySearchPageInputHydrationOnPage(
        page,
        baseUrl,
        query,
        timeoutMs,
      );
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
    }
  });
}
