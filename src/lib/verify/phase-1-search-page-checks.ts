import type { Browser, Locator, Page } from "playwright";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";
import {
  evaluateSearchPageInputHydrationAfterTyping,
  evaluateSearchPageInputHydrationOutcome,
  readSearchPageInputHydrationSnapshot,
  SEARCH_PAGE_EMPTY_SELECTOR,
  SEARCH_PAGE_INPUT_SELECTOR,
  SEARCH_PAGE_LOADING_SELECTOR,
  SEARCH_PAGE_RESULTS_SELECTOR,
  waitForSearchPageInputHydrationBeforeQuery,
} from "./static-export-search-input-hydration-http";

/** Phase 1 manual-gate queries exercised on the built `/search` page. */
export const PHASE_1_SEARCH_PAGE_QUERIES = [
  "GQA",
  "attention",
  "KV cache",
] as const;

export type Phase1SearchPageQuery =
  (typeof PHASE_1_SEARCH_PAGE_QUERIES)[number];

export type Phase1SearchPageCheckFailure = {
  query: string;
  surface: "/search";
  reason: string;
};

export type SearchPageDomSnapshot = {
  hasResults: boolean;
  hasEmpty: boolean;
  hasGroupedQueryAttentionLink: boolean;
  hasGroupedQueryAttentionResultUrl: boolean;
  hasGroupedQueryAttentionButton: boolean;
  /** Visible search-result-url text values from the results region. */
  resultUrls: readonly string[];
};

export const VERIFY_SEARCH_PAGE_STUB_ENV = "VERIFY_SEARCH_PAGE_STUB";

export type RunPhase1SearchPageChecksOptions = {
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
 * Test-only stub hook: VERIFY_SEARCH_PAGE_STUB=pass skips Playwright when the
 * base URL is a static HTTP fixture (see verify-phase-1-ux-verifier script test).
 */
export function resolveSearchPageCheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RunPhase1SearchPageChecksOptions {
  const stub = env[VERIFY_SEARCH_PAGE_STUB_ENV]?.trim();
  if (stub === "pass") {
    return { runQueryCheck: async () => null };
  }
  return {};
}

const SEARCH_RESULT_URL_SELECTOR = '[data-testid="search-result-url"]';

/** Default per-query browser deadline (client hydration can exceed 30s under CI load). */
export const DEFAULT_SEARCH_PAGE_TIMEOUT_MS = 45_000;

export function formatPhase1SearchPageCheckFailure(
  failure: Phase1SearchPageCheckFailure,
): string {
  return `${failure.surface}?query=${encodeURIComponent(failure.query)}: ${failure.reason}`;
}

function normalizeSearchResultUrlText(text: string | null): string {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}

async function readSearchPageResultUrls(scope: Locator): Promise<string[]> {
  const urlNodes = scope.locator(SEARCH_RESULT_URL_SELECTOR);
  const count = await urlNodes.count();
  const urls: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const node = urlNodes.nth(index);
    const ariaHidden = node.locator('[aria-hidden="true"]').first();
    const ariaHiddenCount = await ariaHidden.count();
    const text =
      ariaHiddenCount > 0
        ? await ariaHidden.textContent()
        : await node.textContent();
    const normalized = normalizeSearchResultUrlText(text);
    if (normalized.length > 0) {
      urls.push(normalized);
    }
  }

  return urls;
}

/**
 * Pure collapsed page-hit outcome for `/search` result URLs.
 */
export function evaluateSearchPageCanonicalResultUrls(
  snapshot: SearchPageDomSnapshot,
): string | null {
  if (!snapshot.hasResults || snapshot.resultUrls.length === 0) {
    return null;
  }

  if (snapshot.resultUrls.some((url) => url.includes("#"))) {
    return "search result URL includes a hash fragment";
  }

  const bases = snapshot.resultUrls.map(pageBaseUrl);
  if (new Set(bases).size !== bases.length) {
    return "multiple search hits duplicate one canonical page URL";
  }

  return null;
}

/**
 * Pure DOM outcome for `/search` results — used by Playwright and unit tests.
 */
export function evaluateSearchPageDomSnapshot(
  snapshot: SearchPageDomSnapshot,
  query: string,
): string | null {
  if (snapshot.hasEmpty && !snapshot.hasResults) {
    return `empty results state on /search for query "${query}" — expected visible result for ${PHASE_1_GROUPED_QUERY_ATTENTION_URL}`;
  }

  if (!snapshot.hasResults) {
    return `no search results rendered on /search for query "${query}"`;
  }

  const canonicalFailure = evaluateSearchPageCanonicalResultUrls(snapshot);
  if (canonicalFailure) {
    return canonicalFailure;
  }

  if (
    snapshot.hasGroupedQueryAttentionLink ||
    snapshot.hasGroupedQueryAttentionResultUrl ||
    snapshot.hasGroupedQueryAttentionButton
  ) {
    return null;
  }

  return `no visible link to ${PHASE_1_GROUPED_QUERY_ATTENTION_URL} in /search results for query "${query}"`;
}

export async function readSearchPageDomSnapshot(
  page: Page,
): Promise<SearchPageDomSnapshot> {
  const moduleUrl = PHASE_1_GROUPED_QUERY_ATTENTION_URL;

  const resultsRegion = page.locator(SEARCH_PAGE_RESULTS_SELECTOR);
  const hasResults = await resultsRegion.isVisible();
  const hasEmpty = await page.locator(SEARCH_PAGE_EMPTY_SELECTOR).isVisible();
  const resultUrls = hasResults
    ? await readSearchPageResultUrls(resultsRegion)
    : [];

  const linkCount = await page.locator(`a[href="${moduleUrl}"]`).count();
  const hasGroupedQueryAttentionLink = linkCount > 0;

  let hasGroupedQueryAttentionResultUrl = false;
  for (const url of resultUrls) {
    if (url.includes(moduleUrl)) {
      hasGroupedQueryAttentionResultUrl = true;
      break;
    }
  }

  const buttonCount = await page
    .getByRole("button", { name: /Grouped-Query.*Attention/i })
    .count();
  const hasGroupedQueryAttentionButton = buttonCount > 0;

  return {
    hasResults,
    hasEmpty,
    hasGroupedQueryAttentionLink,
    hasGroupedQueryAttentionResultUrl,
    hasGroupedQueryAttentionButton,
    resultUrls,
  };
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns true when `/search` has a terminal outcome: empty state, populated
 * result URLs, or a visible grouped-query-attention hit marker.
 */
export function isSearchPageDomSnapshotPopulated(
  snapshot: SearchPageDomSnapshot,
): boolean {
  if (snapshot.hasEmpty && !snapshot.hasResults) {
    return true;
  }

  if (snapshot.resultUrls.length > 0) {
    return true;
  }

  if (
    snapshot.hasGroupedQueryAttentionLink ||
    snapshot.hasGroupedQueryAttentionResultUrl ||
    snapshot.hasGroupedQueryAttentionButton
  ) {
    return true;
  }

  return false;
}

async function waitForPopulatedSearchPageDomSnapshot(
  page: Page,
  timeoutMs: number,
): Promise<SearchPageDomSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let snapshot = await readSearchPageDomSnapshot(page);

  while (!isSearchPageDomSnapshotPopulated(snapshot) && Date.now() < deadline) {
    await sleep(250);
    snapshot = await readSearchPageDomSnapshot(page);
  }

  return snapshot;
}

async function waitForSearchPageOutcome(
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

  await Promise.race([
    results.waitFor({ state: "visible", timeout: timeoutMs }),
    empty.waitFor({ state: "visible", timeout: timeoutMs }),
  ]);
}

/**
 * Types a query on `/search` and returns a failure reason, or null when the
 * grouped-query-attention result is visible.
 */
export async function checkSearchPageQuery(
  page: Page,
  baseUrl: string,
  query: string,
  timeoutMs: number = DEFAULT_SEARCH_PAGE_TIMEOUT_MS,
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
    await waitForSearchPageOutcome(page, timeoutMs);
  } catch {
    return `timed out waiting for search results on /search for query "${query}" after ${timeoutMs}ms`;
  }

  const hydrationOutcome = evaluateSearchPageInputHydrationOutcome(
    await readSearchPageInputHydrationSnapshot(page),
  );
  if (hydrationOutcome) {
    return hydrationOutcome;
  }

  const snapshot = await waitForPopulatedSearchPageDomSnapshot(page, timeoutMs);
  return evaluateSearchPageDomSnapshot(snapshot, query);
}

/**
 * Runs Playwright checks for each Phase 1 `/search` query; returns failures.
 */
export async function runPhase1SearchPageChecks(
  baseUrl: string,
  options: RunPhase1SearchPageChecksOptions = {},
): Promise<Phase1SearchPageCheckFailure[]> {
  const queries = options.queries ?? PHASE_1_SEARCH_PAGE_QUERIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SEARCH_PAGE_TIMEOUT_MS;
  const failures: Phase1SearchPageCheckFailure[] = [];

  if (options.runQueryCheck) {
    for (const query of queries) {
      const reason = await options.runQueryCheck(baseUrl, query, timeoutMs);
      if (reason) {
        failures.push({ query, surface: "/search", reason });
      }
    }
    return failures;
  }

  const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
  const browser = await launchBrowser();

  try {
    const queryFailures = await Promise.all(
      queries.map(async (query) => {
        const context = await browser.newContext();
        try {
          const page = await context.newPage();
          page.setDefaultTimeout(timeoutMs);
          page.setDefaultNavigationTimeout(timeoutMs);

          const reason = await checkSearchPageQuery(
            page,
            baseUrl,
            query,
            timeoutMs,
          );
          if (reason) {
            return { query, surface: "/search" as const, reason };
          }
          return null;
        } finally {
          await Promise.race([context.close(), sleep(timeoutMs)]);
        }
      }),
    );

    for (const failure of queryFailures) {
      if (failure) {
        failures.push(failure);
      }
    }
  } finally {
    await closePlaywrightBrowserWithTimeout(browser, timeoutMs);
  }

  return failures;
}

/**
 * Runs `/search` page checks, prints each failure, and throws when any fail.
 */
export async function assertPhase1SearchPage(
  baseUrl: string,
  options: RunPhase1SearchPageChecksOptions = {},
): Promise<void> {
  const failures = await runPhase1SearchPageChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  for (const failure of failures) {
    console.error(formatPhase1SearchPageCheckFailure(failure));
  }

  throw new Error(
    `Phase 1 /search page verification failed (${failures.length} query/queries)`,
  );
}
