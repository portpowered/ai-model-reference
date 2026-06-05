import { type Browser, chromium, type Locator, type Page } from "playwright";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskSearchApiGqaRow,
  buildCustomerAskSearchDialogRowsForQuery,
  buildCustomerAskSearchPageRowsForQuery,
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKS,
  SEARCH_SURFACE_CUSTOMER_ASK_QUERIES,
  SEARCH_SURFACE_CUSTOMER_ASK_ROUTES,
  type SearchSurfaceCustomerAskQuery,
  type SearchSurfaceResultSnapshot,
} from "./customer-ask-search-surface-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import {
  PHASE_1_GROUPED_QUERY_ATTENTION_URL,
  type SearchResultHit,
} from "./phase-1-search-checks";
import {
  checkSearchDialogQuery,
  DEFAULT_SEARCH_DIALOG_TIMEOUT_MS,
} from "./phase-1-search-dialog-checks";
import {
  checkSearchPageQuery,
  DEFAULT_SEARCH_PAGE_TIMEOUT_MS,
  VERIFY_SEARCH_PAGE_STUB_ENV,
} from "./phase-1-search-page-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskSearchSurfaceChecksOptions = {
  timeoutMs?: number;
  queries?: readonly SearchSurfaceCustomerAskQuery[];
  launchBrowser?: () => Promise<Browser>;
  runSearchPageQueryCheck?: (
    baseUrl: string,
    query: SearchSurfaceCustomerAskQuery,
    timeoutMs: number,
  ) => Promise<SearchSurfaceResultSnapshot | { reason: string }>;
  runSearchDialogQueryCheck?: (
    baseUrl: string,
    query: SearchSurfaceCustomerAskQuery,
    timeoutMs: number,
  ) => Promise<SearchSurfaceResultSnapshot | { reason: string }>;
  fetchApiGqaResults?: (
    baseUrl: string,
    timeoutMs: number,
  ) => Promise<
    | { results: SearchResultHit[] }
    | { fetchReason: string; results?: SearchResultHit[] | null }
  >;
};

const SEARCH_RESULT_URL_SELECTOR = '[data-testid="search-result-url"]';
const SEARCH_RESULT_MATCHED_TAGS_SELECTOR =
  '[data-testid="search-result-matched-tags"]';
const SEARCH_PAGE_RESULTS_SELECTOR = '[data-testid="search-page-results"]';
const SEARCH_PAGE_EMPTY_SELECTOR = '[data-testid="search-page-empty"]';
const SEARCH_DIALOG_EMPTY_SELECTOR = '[data-testid="search-dialog-empty"]';

function normalizeResultUrlText(text: string | null): string {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}

async function readResultUrls(locator: Locator): Promise<string[]> {
  const urlNodes = locator.locator(SEARCH_RESULT_URL_SELECTOR);
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
    const normalized = normalizeResultUrlText(text);
    if (normalized.length > 0) {
      urls.push(normalized);
    }
  }

  return urls;
}

export async function readSearchPageSurfaceSnapshot(
  page: Page,
): Promise<SearchSurfaceResultSnapshot> {
  const hasResults = await page
    .locator(SEARCH_PAGE_RESULTS_SELECTOR)
    .isVisible();
  const hasEmpty = await page.locator(SEARCH_PAGE_EMPTY_SELECTOR).isVisible();
  const resultUrls = hasResults
    ? await readResultUrls(page.locator(SEARCH_PAGE_RESULTS_SELECTOR))
    : [];
  const matchedTagsCount = hasResults
    ? await page
        .locator(SEARCH_PAGE_RESULTS_SELECTOR)
        .locator(SEARCH_RESULT_MATCHED_TAGS_SELECTOR)
        .count()
    : 0;

  return {
    resultUrls,
    matchedTagsVisible: matchedTagsCount > 0,
    hasResults: resultUrls.length > 0 || hasResults,
    hasEmpty,
  };
}

export async function readSearchDialogSurfaceSnapshot(
  dialog: Locator,
): Promise<SearchSurfaceResultSnapshot> {
  const resultUrls = await readResultUrls(dialog);
  const hasResults = resultUrls.length > 0;
  const hasEmpty = await dialog
    .locator(SEARCH_DIALOG_EMPTY_SELECTOR)
    .isVisible();
  const matchedTagsCount = await dialog
    .locator(SEARCH_RESULT_MATCHED_TAGS_SELECTOR)
    .count();

  return {
    resultUrls,
    matchedTagsVisible: matchedTagsCount > 0,
    hasResults,
    hasEmpty,
  };
}

function buildProbeFailureRows(
  checkIds: string[],
  route: (typeof SEARCH_SURFACE_CUSTOMER_ASK_ROUTES)[keyof typeof SEARCH_SURFACE_CUSTOMER_ASK_ROUTES],
  query: string,
  reason: string,
): CustomerAskConvergenceRow[] {
  return checkIds.map((checkId) => {
    const check = Object.values(SEARCH_SURFACE_CUSTOMER_ASK_CHECKS).find(
      (entry) => entry.checkId === checkId,
    );
    return {
      checkId,
      title: check?.title ?? checkId,
      status: "fail" as const,
      route,
      query,
      reason,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  });
}

function pageCheckIdsForQuery(): string[] {
  return [
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
  ];
}

function dialogCheckIdsForQuery(): string[] {
  return [SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId];
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function defaultSearchPageQueryCheck(
  page: Page,
  baseUrl: string,
  query: SearchSurfaceCustomerAskQuery,
  timeoutMs: number,
): Promise<SearchSurfaceResultSnapshot | { reason: string }> {
  const probeReason = await checkSearchPageQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (probeReason?.includes("timed out")) {
    return { reason: probeReason };
  }

  return readSearchPageSurfaceSnapshot(page);
}

async function defaultSearchDialogQueryCheck(
  page: Page,
  baseUrl: string,
  query: SearchSurfaceCustomerAskQuery,
  timeoutMs: number,
): Promise<SearchSurfaceResultSnapshot | { reason: string }> {
  const probeReason = await checkSearchDialogQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (probeReason?.includes("timed out")) {
    return { reason: probeReason };
  }

  const dialog = page.getByRole("dialog", { name: "Search" });
  return readSearchDialogSurfaceSnapshot(dialog);
}

function parseSearchResultsJson(body: string): {
  results: SearchResultHit[] | null;
  reason: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { results: null, reason: "response body is not valid JSON" };
  }

  if (!Array.isArray(parsed)) {
    return { results: null, reason: "expected JSON array of search hits" };
  }

  for (const [index, entry] of parsed.entries()) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { url?: unknown }).url !== "string"
    ) {
      return {
        results: null,
        reason: `hit at index ${index} is missing a string url`,
      };
    }
  }

  return { results: parsed as SearchResultHit[], reason: null };
}

async function defaultFetchApiGqaResults(
  baseUrl: string,
  timeoutMs: number,
): Promise<
  | { results: SearchResultHit[] }
  | { fetchReason: string; results?: SearchResultHit[] | null }
> {
  const url = `${normalizeVerifyBaseUrl(baseUrl)}/api/search?query=${encodeURIComponent("GQA")}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return { fetchReason: `expected HTTP 200, received HTTP ${status}` };
    }

    const { results, reason } = parseSearchResultsJson(body);
    if (reason || results === null) {
      return { fetchReason: reason ?? "failed to parse GQA search results" };
    }

    return { results };
  } catch (error) {
    const fetchReason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return { fetchReason };
  }
}

/**
 * Fetches built search surfaces and returns customer-ask search convergence rows.
 */
export async function runCustomerAskSearchSurfaceChecks(
  baseUrl: string,
  options: RunCustomerAskSearchSurfaceChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const queries = options.queries ?? SEARCH_SURFACE_CUSTOMER_ASK_QUERIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const pageTimeoutMs = Math.max(timeoutMs, DEFAULT_SEARCH_PAGE_TIMEOUT_MS);
  const dialogTimeoutMs = Math.max(timeoutMs, DEFAULT_SEARCH_DIALOG_TIMEOUT_MS);
  const rows: CustomerAskConvergenceRow[] = [];

  const runPageCheck =
    options.runSearchPageQueryCheck ??
    (async (probeBaseUrl, query, probeTimeoutMs) => {
      const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(probeTimeoutMs);
        return defaultSearchPageQueryCheck(
          page,
          probeBaseUrl,
          query,
          probeTimeoutMs,
        );
      } finally {
        await browser.close();
      }
    });

  const runDialogCheck =
    options.runSearchDialogQueryCheck ??
    (async (probeBaseUrl, query, probeTimeoutMs) => {
      const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(probeTimeoutMs);
        return defaultSearchDialogQueryCheck(
          page,
          probeBaseUrl,
          query,
          probeTimeoutMs,
        );
      } finally {
        await browser.close();
      }
    });

  for (const query of queries) {
    const pageResult = await runPageCheck(baseUrl, query, pageTimeoutMs);
    if ("reason" in pageResult) {
      rows.push(
        ...buildProbeFailureRows(
          pageCheckIdsForQuery(),
          SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.searchPage,
          query,
          pageResult.reason,
        ),
      );
      continue;
    }

    rows.push(...buildCustomerAskSearchPageRowsForQuery(pageResult, query));
  }

  for (const query of queries) {
    const dialogResult = await runDialogCheck(baseUrl, query, dialogTimeoutMs);
    if ("reason" in dialogResult) {
      rows.push(
        ...buildProbeFailureRows(
          dialogCheckIdsForQuery(),
          SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.headerDialog,
          query,
          dialogResult.reason,
        ),
      );
      continue;
    }

    rows.push(...buildCustomerAskSearchDialogRowsForQuery(dialogResult, query));
  }

  const fetchApiGqaResults =
    options.fetchApiGqaResults ?? defaultFetchApiGqaResults;
  const apiResult = await fetchApiGqaResults(baseUrl, timeoutMs);
  if ("fetchReason" in apiResult) {
    rows.push(
      buildCustomerAskSearchApiGqaRow(
        apiResult.results ?? null,
        apiResult.fetchReason,
      ),
    );
  } else {
    rows.push(buildCustomerAskSearchApiGqaRow(apiResult.results));
  }

  return rows;
}

export const VERIFY_CUSTOMER_ASK_SEARCH_STUB_ENV =
  "VERIFY_CUSTOMER_ASK_SEARCH_STUB";

const PASSING_CUSTOMER_ASK_SEARCH_SNAPSHOT: SearchSurfaceResultSnapshot = {
  resultUrls: [PHASE_1_GROUPED_QUERY_ATTENTION_URL, "/docs/glossary/token"],
  matchedTagsVisible: false,
  hasResults: true,
  hasEmpty: false,
};

/**
 * Test-only stub hook: when VERIFY_CUSTOMER_ASK_SEARCH_STUB=pass or
 * VERIFY_SEARCH_PAGE_STUB=pass, skips Playwright for customer-ask search rows.
 */
export function resolveCustomerAskSearchSurfaceCheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RunCustomerAskSearchSurfaceChecksOptions {
  const customerAskStub = env[VERIFY_CUSTOMER_ASK_SEARCH_STUB_ENV]?.trim();
  const pageStub = env[VERIFY_SEARCH_PAGE_STUB_ENV]?.trim();
  if (customerAskStub !== "pass" && pageStub !== "pass") {
    return {};
  }

  return {
    runSearchPageQueryCheck: async () => PASSING_CUSTOMER_ASK_SEARCH_SNAPSHOT,
    runSearchDialogQueryCheck: async () => ({
      resultUrls: [PHASE_1_GROUPED_QUERY_ATTENTION_URL],
      matchedTagsVisible: false,
      hasResults: true,
      hasEmpty: false,
    }),
    fetchApiGqaResults: async () => ({
      results: [
        { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL },
        { url: "/docs/glossary/token" },
      ],
    }),
  };
}

export { PHASE_1_GROUPED_QUERY_ATTENTION_URL };
