import type { Browser, Page } from "playwright";
import { httpGetText } from "./http-harness";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import { assertSearchPageExportShell } from "./phase-1-search-export-shell-checks";
import {
  evaluateSearchPageDomSnapshot,
  readSearchPageDomSnapshot,
} from "./phase-1-search-page-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";
import {
  SEARCH_PAGE_EMPTY_SELECTOR,
  SEARCH_PAGE_IDLE_SELECTOR,
  SEARCH_PAGE_INPUT_SELECTOR,
  SEARCH_PAGE_LOADING_SELECTOR,
  SEARCH_PAGE_RESULTS_SELECTOR,
} from "./static-export-search-input-hydration-http";

export const DEFAULT_SEARCH_URL_HANDOFF_TIMEOUT_MS = 45_000;

export const SEARCH_PAGE_TAG_FILTER_DESCRIPTION_PREFIX =
  "Showing results for resources tagged ";

export type SearchPageUrlHandoffSnapshot = {
  inputVisible: boolean;
  inputValue: string;
  tagFilterDescriptionVisible: boolean;
  tagFilterDescriptionText: string;
  idleVisible: boolean;
  loadingVisible: boolean;
  resultsVisible: boolean;
  emptyVisible: boolean;
};

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

export async function readSearchPageUrlHandoffSnapshot(
  page: Page,
): Promise<SearchPageUrlHandoffSnapshot> {
  const input = page.locator(SEARCH_PAGE_INPUT_SELECTOR);
  const tagFilter = page.getByText(/Showing results for resources tagged/);
  const tagFilterDescriptionVisible = await tagFilter.isVisible();

  return {
    inputVisible: await input.isVisible(),
    inputValue: await input.inputValue(),
    tagFilterDescriptionVisible,
    tagFilterDescriptionText: tagFilterDescriptionVisible
      ? ((await tagFilter.textContent()) ?? "")
      : "",
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
 * Pure `/search?q=` handoff outcome — used by Playwright and unit tests.
 */
export function evaluateSearchPageQueryHandoff(
  snapshot: SearchPageUrlHandoffSnapshot,
  expectedQuery: string,
): string | null {
  if (!snapshot.inputVisible) {
    return "search input is not visible on /search?q= handoff";
  }

  if (snapshot.inputValue !== expectedQuery) {
    return `search input value "${snapshot.inputValue}" did not prefill to "${expectedQuery}" from ?q= on /search`;
  }

  if (snapshot.idleVisible) {
    return "idle state remained visible after ?q= handoff on /search";
  }

  if (
    !snapshot.loadingVisible &&
    !snapshot.resultsVisible &&
    !snapshot.emptyVisible
  ) {
    return `no loading, results, or empty outcome after ?q=${expectedQuery} handoff on /search`;
  }

  return null;
}

/**
 * Pure `/search?tag=` handoff outcome — used by Playwright and unit tests.
 */
export function evaluateSearchPageTagHandoff(
  snapshot: SearchPageUrlHandoffSnapshot,
  tagSlug: string,
): string | null {
  const expectedDescription = `${SEARCH_PAGE_TAG_FILTER_DESCRIPTION_PREFIX}${tagSlug}.`;

  if (!snapshot.inputVisible) {
    return "search input is not visible on /search?tag= handoff";
  }

  if (!snapshot.tagFilterDescriptionVisible) {
    return `tag filter description is not visible for /search?tag=${tagSlug}`;
  }

  if (snapshot.tagFilterDescriptionText !== expectedDescription) {
    return `tag filter description "${snapshot.tagFilterDescriptionText}" did not match "${expectedDescription}"`;
  }

  if (snapshot.inputValue !== tagSlug) {
    return `search input value "${snapshot.inputValue}" did not prefill to tag slug "${tagSlug}" on /search?tag=`;
  }

  if (snapshot.idleVisible) {
    return "idle state remained visible after ?tag= handoff on /search";
  }

  if (
    !snapshot.loadingVisible &&
    !snapshot.resultsVisible &&
    !snapshot.emptyVisible
  ) {
    return `no loading, results, or empty outcome after ?tag=${tagSlug} handoff on /search`;
  }

  return null;
}

/**
 * Pure `/search?q=&tag=` precedence outcome — q must win over tag.
 */
export function evaluateSearchPageQueryPrecedenceOverTag(
  snapshot: SearchPageUrlHandoffSnapshot,
  expectedQuery: string,
  tagSlug: string,
): string | null {
  if (!snapshot.inputVisible) {
    return "search input is not visible on /search?q=&tag= handoff";
  }

  if (snapshot.inputValue !== expectedQuery) {
    return `search input value "${snapshot.inputValue}" did not prefer ?q=${expectedQuery} over ?tag=${tagSlug}`;
  }

  if (snapshot.tagFilterDescriptionVisible) {
    return "tag filter description remained visible when both ?q= and ?tag= were present";
  }

  if (snapshot.idleVisible) {
    return "idle state remained visible after combined ?q=&tag= handoff on /search";
  }

  if (
    !snapshot.loadingVisible &&
    !snapshot.resultsVisible &&
    !snapshot.emptyVisible
  ) {
    return `no loading, results, or empty outcome after ?q=${expectedQuery}&tag=${tagSlug} handoff on /search`;
  }

  return null;
}

async function waitForSearchPageHandoffOutcome(
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

export async function verifySearchPageUrlHandoffOnPage(
  page: Page,
  baseUrl: string,
  searchPath: string,
  evaluateHandoff: (snapshot: SearchPageUrlHandoffSnapshot) => string | null,
  expectedQueryForResults: string,
  timeoutMs: number,
): Promise<string | null> {
  const searchUrl = `${normalizeVerifyBaseUrl(baseUrl)}${searchPath}`;
  await page.goto(searchUrl, {
    timeout: timeoutMs,
    waitUntil: "load",
  });

  const input = page.locator(SEARCH_PAGE_INPUT_SELECTOR);
  try {
    await input.waitFor({ state: "visible", timeout: timeoutMs });
  } catch {
    return `search input did not hydrate on ${searchPath} within ${timeoutMs}ms`;
  }

  try {
    await waitForSearchPageHandoffOutcome(page, timeoutMs);
  } catch {
    return `timed out waiting for search outcome on ${searchPath} after ${timeoutMs}ms`;
  }

  const handoffFailure = evaluateHandoff(
    await readSearchPageUrlHandoffSnapshot(page),
  );
  if (handoffFailure) {
    return handoffFailure;
  }

  const domFailure = evaluateSearchPageDomSnapshot(
    await readSearchPageDomSnapshot(page),
    expectedQueryForResults,
  );
  return domFailure;
}

export type VerifyStaticExportSearchUrlHandoffOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
};

/**
 * Verifies exported `/search` honors ?q=, ?tag=, and q-over-tag URL handoffs
 * when served from a static export HTTP server (including GitHub Pages base paths).
 */
export async function verifyStaticExportSearchUrlHandoff(
  baseUrl: string,
  options: VerifyStaticExportSearchUrlHandoffOptions = {},
): Promise<string | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SEARCH_URL_HANDOFF_TIMEOUT_MS;
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
    const handoffChecks: Array<{
      searchPath: string;
      evaluateHandoff: (
        snapshot: SearchPageUrlHandoffSnapshot,
      ) => string | null;
      expectedQueryForResults: string;
      failurePrefix: string;
    }> = [
      {
        searchPath: "/search?q=GQA",
        evaluateHandoff: (snapshot) =>
          evaluateSearchPageQueryHandoff(snapshot, "GQA"),
        expectedQueryForResults: "GQA",
        failurePrefix: "/search?q=GQA",
      },
      {
        searchPath: "/search?tag=attention",
        evaluateHandoff: (snapshot) =>
          evaluateSearchPageTagHandoff(snapshot, "attention"),
        expectedQueryForResults: "attention",
        failurePrefix: "/search?tag=attention",
      },
      {
        searchPath: "/search?q=GQA&tag=attention",
        evaluateHandoff: (snapshot) =>
          evaluateSearchPageQueryPrecedenceOverTag(
            snapshot,
            "GQA",
            "attention",
          ),
        expectedQueryForResults: "GQA",
        failurePrefix: "/search?q=GQA&tag=attention",
      },
    ];

    for (const handoff of handoffChecks) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(timeoutMs);
        page.setDefaultNavigationTimeout(timeoutMs);

        const handoffFailure = await verifySearchPageUrlHandoffOnPage(
          page,
          baseUrl,
          handoff.searchPath,
          handoff.evaluateHandoff,
          handoff.expectedQueryForResults,
          timeoutMs,
        );
        if (handoffFailure) {
          return `${handoff.failurePrefix}: ${handoffFailure}`;
        }
      } finally {
        await context.close();
      }
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }
}
