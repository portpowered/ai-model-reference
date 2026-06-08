import type { Browser, Page } from "playwright";
import { withExportIntegrationProbeLock } from "./export-integration-probe-lock";
import { httpGetText } from "./http-harness";
import {
  isPlaywrightLaunchRetryableError,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";
import { assertSearchPageExportShell } from "./phase-1-search-export-shell-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";
import {
  SEARCH_PAGE_EMPTY_SELECTOR,
  SEARCH_PAGE_INPUT_SELECTOR,
  SEARCH_PAGE_LOADING_SELECTOR,
  SEARCH_PAGE_RESULTS_SELECTOR,
} from "./static-export-search-input-hydration-http";

export const DEFAULT_STATIC_EXPORT_EMPTY_ERROR_STATES_TIMEOUT_MS = 30_000;

export const SEARCH_PAGE_ERROR_SELECTOR = '[data-testid="search-page-error"]';
export const SEARCH_PAGE_RESULT_ROW_SELECTOR =
  '[data-testid="search-result-row"]';

export const DEFAULT_EMPTY_STATE_QUERY = "zzzz-no-matches-zzzz";
export const DEFAULT_ERROR_STATE_QUERY = "GQA";
export const DEFAULT_ACCESSIBILITY_QUERY = "GQA";

export const SEARCH_NO_RESULTS_COPY = "No results found.";
export const SEARCH_ERROR_COPY =
  "Search is temporarily unavailable. The index could not be loaded.";
export const SEARCH_RETRY_LABEL = "Try again";
export const EMPTY_SUGGESTION_GQA = "GQA";
export const EMPTY_SUGGESTION_ATTENTION_LINK_LABEL = "attention tag index";
export const ATTENTION_TAG_PATH_SUFFIX = "/tags/attention";

export const DOCS_SEARCH_BOOTSTRAP_ROUTE_PATTERN = "**/api/search";

export type SearchPageEmptyStateSnapshot = {
  emptyVisible: boolean;
  noResultsCopyVisible: boolean;
  gqaSuggestionVisible: boolean;
  attentionLinkVisible: boolean;
  attentionLinkHref: string | null;
  liveRegionPolite: boolean;
};

export type SearchPageErrorStateSnapshot = {
  errorVisible: boolean;
  errorCopyVisible: boolean;
  retryVisible: boolean;
};

export type SearchPageResultsAccessibilitySnapshot = {
  liveRegionPolite: boolean;
  resultsVisible: boolean;
  firstResultRowFocusable: boolean;
};

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

async function readLiveRegionPolite(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const region = document.querySelector('[aria-live="polite"]');
    return region !== null;
  });
}

export async function readSearchPageEmptyStateSnapshot(
  page: Page,
): Promise<SearchPageEmptyStateSnapshot> {
  const empty = page.locator(SEARCH_PAGE_EMPTY_SELECTOR);
  const emptyVisible = await empty.isVisible();

  return {
    emptyVisible,
    noResultsCopyVisible: emptyVisible
      ? await page.getByText(SEARCH_NO_RESULTS_COPY).isVisible()
      : false,
    gqaSuggestionVisible: emptyVisible
      ? await page
          .getByRole("button", { name: EMPTY_SUGGESTION_GQA })
          .isVisible()
      : false,
    attentionLinkVisible: emptyVisible
      ? await page
          .getByRole("link", { name: EMPTY_SUGGESTION_ATTENTION_LINK_LABEL })
          .isVisible()
      : false,
    attentionLinkHref: emptyVisible
      ? await page
          .getByRole("link", { name: EMPTY_SUGGESTION_ATTENTION_LINK_LABEL })
          .getAttribute("href")
      : null,
    liveRegionPolite: await readLiveRegionPolite(page),
  };
}

export async function readSearchPageErrorStateSnapshot(
  page: Page,
): Promise<SearchPageErrorStateSnapshot> {
  const error = page.locator(SEARCH_PAGE_ERROR_SELECTOR);
  const errorVisible = await error.isVisible();

  return {
    errorVisible,
    errorCopyVisible: errorVisible
      ? await page.getByText(SEARCH_ERROR_COPY).isVisible()
      : false,
    retryVisible: errorVisible
      ? await page.getByRole("button", { name: SEARCH_RETRY_LABEL }).isVisible()
      : false,
  };
}

export async function readSearchPageResultsAccessibilitySnapshot(
  page: Page,
): Promise<SearchPageResultsAccessibilitySnapshot> {
  const results = page.locator(SEARCH_PAGE_RESULTS_SELECTOR);
  const resultsVisible = await results.isVisible();
  let firstResultRowFocusable = false;

  if (resultsVisible) {
    const firstRow = results.locator(SEARCH_PAGE_RESULT_ROW_SELECTOR).first();
    if ((await firstRow.count()) > 0) {
      await firstRow.focus();
      firstResultRowFocusable = await firstRow.evaluate(
        (element) => element === document.activeElement,
      );
    }
  }

  return {
    liveRegionPolite: await readLiveRegionPolite(page),
    resultsVisible,
    firstResultRowFocusable,
  };
}

/**
 * Pure empty-state outcome for exported `/search` — used by Playwright and unit tests.
 */
export function evaluateSearchPageEmptyState(
  snapshot: SearchPageEmptyStateSnapshot,
): string | null {
  if (!snapshot.emptyVisible) {
    return "empty state is not visible on /search for a no-match query";
  }

  if (!snapshot.noResultsCopyVisible) {
    return `empty state did not show no-results copy "${SEARCH_NO_RESULTS_COPY}"`;
  }

  if (!snapshot.gqaSuggestionVisible) {
    return `empty state did not show GQA suggestion button "${EMPTY_SUGGESTION_GQA}"`;
  }

  if (!snapshot.attentionLinkVisible) {
    return `empty state did not show attention tag index link "${EMPTY_SUGGESTION_ATTENTION_LINK_LABEL}"`;
  }

  if (
    snapshot.attentionLinkHref === null ||
    !snapshot.attentionLinkHref.includes(ATTENTION_TAG_PATH_SUFFIX)
  ) {
    return `attention tag index link href "${snapshot.attentionLinkHref ?? ""}" did not include ${ATTENTION_TAG_PATH_SUFFIX}`;
  }

  if (!snapshot.liveRegionPolite) {
    return 'outcome region is missing aria-live="polite" on /search empty state';
  }

  return null;
}

/**
 * Pure error-state outcome for exported `/search` — used by Playwright and unit tests.
 */
export function evaluateSearchPageErrorState(
  snapshot: SearchPageErrorStateSnapshot,
): string | null {
  if (!snapshot.errorVisible) {
    return "error state is not visible on /search when bootstrap fetch fails";
  }

  if (!snapshot.errorCopyVisible) {
    return `error state did not show error copy "${SEARCH_ERROR_COPY}"`;
  }

  if (!snapshot.retryVisible) {
    return `error state did not show retry control "${SEARCH_RETRY_LABEL}"`;
  }

  return null;
}

/**
 * Pure accessibility outcome for exported `/search` results — used by Playwright and unit tests.
 */
export function evaluateSearchPageResultsAccessibility(
  snapshot: SearchPageResultsAccessibilitySnapshot,
): string | null {
  if (!snapshot.liveRegionPolite) {
    return 'outcome region is missing aria-live="polite" on /search results';
  }

  if (!snapshot.resultsVisible) {
    return "search results region is not visible for accessibility check on /search";
  }

  if (!snapshot.firstResultRowFocusable) {
    return "first search result row is not keyboard focusable on /search";
  }

  return null;
}

async function waitForSearchPageEmptyOutcome(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const loading = page.locator(SEARCH_PAGE_LOADING_SELECTOR);
  const empty = page.locator(SEARCH_PAGE_EMPTY_SELECTOR);

  await Promise.race([
    loading.waitFor({ state: "visible", timeout: timeoutMs }),
    empty.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);

  await empty.waitFor({ state: "visible", timeout: timeoutMs });
}

async function waitForSearchPageErrorOutcome(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const loading = page.locator(SEARCH_PAGE_LOADING_SELECTOR);
  const error = page.locator(SEARCH_PAGE_ERROR_SELECTOR);

  await Promise.race([
    loading.waitFor({ state: "visible", timeout: timeoutMs }),
    error.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);

  await error.waitFor({ state: "visible", timeout: timeoutMs });
}

async function waitForSearchPageResultsOutcome(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const loading = page.locator(SEARCH_PAGE_LOADING_SELECTOR);
  const results = page.locator(SEARCH_PAGE_RESULTS_SELECTOR);

  await Promise.race([
    loading.waitFor({ state: "visible", timeout: timeoutMs }),
    results.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);

  await results.waitFor({ state: "visible", timeout: timeoutMs });
}

async function typeSearchPageQuery(
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

  const input = page.locator(SEARCH_PAGE_INPUT_SELECTOR);
  try {
    await input.waitFor({ state: "visible", timeout: timeoutMs });
  } catch {
    return `search input did not hydrate on /search within ${timeoutMs}ms`;
  }

  await input.focus();
  await input.pressSequentially(query, { delay: 30 });
  return null;
}

export async function verifySearchPageEmptyStateOnPage(
  page: Page,
  baseUrl: string,
  query: string,
  timeoutMs: number,
): Promise<string | null> {
  const navigationFailure = await typeSearchPageQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (navigationFailure) {
    return navigationFailure;
  }

  try {
    await waitForSearchPageEmptyOutcome(page, timeoutMs);
  } catch {
    return `timed out waiting for empty state on /search for query "${query}" after ${timeoutMs}ms`;
  }

  return evaluateSearchPageEmptyState(
    await readSearchPageEmptyStateSnapshot(page),
  );
}

export async function verifySearchPageErrorStateOnPage(
  page: Page,
  baseUrl: string,
  query: string,
  timeoutMs: number,
): Promise<string | null> {
  await page.route(DOCS_SEARCH_BOOTSTRAP_ROUTE_PATTERN, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "missing",
    });
  });

  const navigationFailure = await typeSearchPageQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (navigationFailure) {
    return navigationFailure;
  }

  try {
    await waitForSearchPageErrorOutcome(page, timeoutMs);
  } catch {
    return `timed out waiting for error state on /search after bootstrap failure for query "${query}" after ${timeoutMs}ms`;
  }

  const snapshot = await readSearchPageErrorStateSnapshot(page);
  const evaluationFailure = evaluateSearchPageErrorState(snapshot);
  if (evaluationFailure) {
    return evaluationFailure;
  }

  try {
    await Promise.all([
      page.waitForEvent("load", { timeout: timeoutMs }),
      page.getByRole("button", { name: SEARCH_RETRY_LABEL }).click(),
    ]);
  } catch {
    return `retry control "${SEARCH_RETRY_LABEL}" did not reload /search after bootstrap failure`;
  }

  return null;
}

export async function verifySearchPageResultsAccessibilityOnPage(
  page: Page,
  baseUrl: string,
  query: string,
  timeoutMs: number,
): Promise<string | null> {
  const navigationFailure = await typeSearchPageQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (navigationFailure) {
    return navigationFailure;
  }

  try {
    await waitForSearchPageResultsOutcome(page, timeoutMs);
  } catch {
    return `timed out waiting for search results on /search for accessibility query "${query}" after ${timeoutMs}ms`;
  }

  return evaluateSearchPageResultsAccessibility(
    await readSearchPageResultsAccessibilitySnapshot(page),
  );
}

export type VerifyStaticExportSearchEmptyErrorStatesOptions = {
  timeoutMs?: number;
  emptyQuery?: string;
  errorQuery?: string;
  accessibilityQuery?: string;
  launchBrowser?: () => Promise<Browser>;
};

/**
 * Verifies exported `/search` empty, error, and accessibility outcome states on a
 * static export HTTP server (including GitHub Pages base paths).
 */
export async function verifyStaticExportSearchEmptyErrorStates(
  baseUrl: string,
  options: VerifyStaticExportSearchEmptyErrorStatesOptions = {},
): Promise<string | null> {
  return withExportIntegrationProbeLock(async () => {
    const timeoutMs =
      options.timeoutMs ?? DEFAULT_STATIC_EXPORT_EMPTY_ERROR_STATES_TIMEOUT_MS;
    const emptyQuery = options.emptyQuery ?? DEFAULT_EMPTY_STATE_QUERY;
    const errorQuery = options.errorQuery ?? DEFAULT_ERROR_STATE_QUERY;
    const accessibilityQuery =
      options.accessibilityQuery ?? DEFAULT_ACCESSIBILITY_QUERY;
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

    let browser: Browser | undefined;
    try {
      browser = await launchBrowser();
      const emptyContext = await browser.newContext();
      try {
        const emptyPage = await emptyContext.newPage();
        emptyPage.setDefaultTimeout(timeoutMs);
        emptyPage.setDefaultNavigationTimeout(timeoutMs);
        const emptyFailure = await verifySearchPageEmptyStateOnPage(
          emptyPage,
          baseUrl,
          emptyQuery,
          timeoutMs,
        );
        if (emptyFailure) {
          return emptyFailure;
        }
      } finally {
        await emptyContext.close();
      }

      const errorContext = await browser.newContext();
      try {
        const errorPage = await errorContext.newPage();
        errorPage.setDefaultTimeout(timeoutMs);
        errorPage.setDefaultNavigationTimeout(timeoutMs);
        const errorFailure = await verifySearchPageErrorStateOnPage(
          errorPage,
          baseUrl,
          errorQuery,
          timeoutMs,
        );
        if (errorFailure) {
          return errorFailure;
        }
      } finally {
        await errorContext.close();
      }

      const accessibilityContext = await browser.newContext();
      try {
        const accessibilityPage = await accessibilityContext.newPage();
        accessibilityPage.setDefaultTimeout(timeoutMs);
        accessibilityPage.setDefaultNavigationTimeout(timeoutMs);
        const accessibilityFailure =
          await verifySearchPageResultsAccessibilityOnPage(
            accessibilityPage,
            baseUrl,
            accessibilityQuery,
            timeoutMs,
          );
        if (accessibilityFailure) {
          return accessibilityFailure;
        }
      } finally {
        await accessibilityContext.close();
      }

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore cleanup races after transient spawn failures
        }
      }
    }
  });
}

export function isRetryableStaticExportSearchProbeFailure(
  reason: string | null,
): reason is string {
  if (!reason) {
    return false;
  }

  return (
    reason.includes("Failed to connect") ||
    isPlaywrightLaunchRetryableError(new Error(reason))
  );
}
