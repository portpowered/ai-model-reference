import { type Browser, chromium, type Page } from "playwright";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

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

const SEARCH_PAGE_INPUT_SELECTOR = "#search-page-input";
const SEARCH_PAGE_RESULTS_SELECTOR = '[data-testid="search-page-results"]';
const SEARCH_PAGE_EMPTY_SELECTOR = '[data-testid="search-page-empty"]';
const SEARCH_RESULT_URL_SELECTOR = '[data-testid="search-result-url"]';

/** Default per-query browser deadline (Orama client hydration can exceed 10s). */
export const DEFAULT_SEARCH_PAGE_TIMEOUT_MS = 15_000;

export function formatPhase1SearchPageCheckFailure(
  failure: Phase1SearchPageCheckFailure,
): string {
  return `${failure.surface}?query=${encodeURIComponent(failure.query)}: ${failure.reason}`;
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

  const hasResults = await page
    .locator(SEARCH_PAGE_RESULTS_SELECTOR)
    .isVisible();
  const hasEmpty = await page.locator(SEARCH_PAGE_EMPTY_SELECTOR).isVisible();

  const linkCount = await page.locator(`a[href="${moduleUrl}"]`).count();
  const hasGroupedQueryAttentionLink = linkCount > 0;

  const urlNodes = page.locator(SEARCH_RESULT_URL_SELECTOR);
  const urlNodeCount = await urlNodes.count();
  let hasGroupedQueryAttentionResultUrl = false;
  for (let index = 0; index < urlNodeCount; index += 1) {
    const text = await urlNodes.nth(index).textContent();
    if (text?.includes(moduleUrl)) {
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
  };
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function waitForSearchPageOutcome(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const results = page.locator(SEARCH_PAGE_RESULTS_SELECTOR);
  const empty = page.locator(SEARCH_PAGE_EMPTY_SELECTOR);

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
    waitUntil: "domcontentloaded",
  });

  const input = page.locator(SEARCH_PAGE_INPUT_SELECTOR);
  await input.fill("");
  await input.fill(query);

  try {
    await waitForSearchPageOutcome(page, timeoutMs);
  } catch {
    return `timed out waiting for search results on /search for query "${query}" after ${timeoutMs}ms`;
  }

  const snapshot = await readSearchPageDomSnapshot(page);
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
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);

    for (const query of queries) {
      const reason = await checkSearchPageQuery(
        page,
        baseUrl,
        query,
        timeoutMs,
      );
      if (reason) {
        failures.push({ query, surface: "/search", reason });
      }
    }
  } finally {
    await browser.close();
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
