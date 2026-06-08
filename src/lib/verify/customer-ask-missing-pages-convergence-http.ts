import type { Browser, Page } from "playwright";
import {
  BATCH_012_ATTENTION_SEARCH_QUERY,
  BATCH_012_MISSING_PAGES_CHECKS,
  BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
  BATCH_012_MISSING_PAGES_MODULE_CHECKLIST_ROW,
  BATCH_012_MISSING_PAGES_ROUTES,
  BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW,
} from "./batch-012-missing-pages-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskAttentionDiscoverableApiRow,
  buildCustomerAskAttentionDiscoverableSearchRow,
  buildCustomerAskAttentionRouteRow,
  buildCustomerAskHiddenSizeRouteRow,
  buildCustomerAskVectorRouteRow,
} from "./customer-ask-missing-pages-convergence";
import type { SearchSurfaceResultSnapshot } from "./customer-ask-search-surface-convergence";
import { readSearchPageSurfaceSnapshot } from "./customer-ask-search-surface-convergence-http";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import {
  PHASE_1_ATTENTION_MODULE_URL,
  type SearchResultHit,
} from "./phase-1-search-checks";
import {
  checkSearchPageQuery,
  DEFAULT_SEARCH_PAGE_TIMEOUT_MS,
} from "./phase-1-search-page-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

const ROUTE_CHECKS = [
  {
    route: BATCH_012_MISSING_PAGES_ROUTES.attentionModule,
    check: BATCH_012_MISSING_PAGES_CHECKS.attentionRoute,
    checklistRow: BATCH_012_MISSING_PAGES_MODULE_CHECKLIST_ROW,
    buildRow: buildCustomerAskAttentionRouteRow,
  },
  {
    route: BATCH_012_MISSING_PAGES_ROUTES.vectorGlossary,
    check: BATCH_012_MISSING_PAGES_CHECKS.vectorRoute,
    checklistRow: BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
    buildRow: buildCustomerAskVectorRouteRow,
  },
  {
    route: BATCH_012_MISSING_PAGES_ROUTES.hiddenSizeGlossary,
    check: BATCH_012_MISSING_PAGES_CHECKS.hiddenSizeRoute,
    checklistRow: BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
    buildRow: buildCustomerAskHiddenSizeRouteRow,
  },
] as const;

export type RunCustomerAskMissingPagesChecksOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
  /**
   * Test hook: when set, returns rendered `/search` attention-query snapshot
   * instead of the default Playwright probe.
   */
  runSearchAttentionSnapshotProbe?: (
    baseUrl: string,
    timeoutMs: number,
  ) => Promise<SearchSurfaceResultSnapshot | { reason: string }>;
  fetchAttentionApiResults?: (
    baseUrl: string,
    timeoutMs: number,
  ) => Promise<
    | { results: SearchResultHit[] }
    | { fetchReason: string; results?: SearchResultHit[] | null }
  >;
};

function buildRouteHttpFailureRow(
  check: (typeof BATCH_012_MISSING_PAGES_CHECKS)[keyof typeof BATCH_012_MISSING_PAGES_CHECKS],
  route: string,
  checklistRow: string,
  reason: string,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route,
    reason,
    checklistRow,
  };
}

function buildSearchAttentionHttpFailureRow(
  reason: string,
): CustomerAskConvergenceRow {
  const check = BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable;
  return {
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route: BATCH_012_MISSING_PAGES_ROUTES.searchPage,
    query: BATCH_012_ATTENTION_SEARCH_QUERY,
    reason,
    checklistRow: BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW,
  };
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

async function defaultSearchAttentionSnapshotProbe(
  page: Page,
  baseUrl: string,
  timeoutMs: number,
): Promise<SearchSurfaceResultSnapshot | { reason: string }> {
  const probeReason = await checkSearchPageQuery(
    page,
    baseUrl,
    BATCH_012_ATTENTION_SEARCH_QUERY,
    timeoutMs,
  );
  if (probeReason?.includes("timed out")) {
    return { reason: probeReason };
  }

  return readSearchPageSurfaceSnapshot(page);
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

async function defaultFetchAttentionApiResults(
  baseUrl: string,
  timeoutMs: number,
): Promise<
  | { results: SearchResultHit[] }
  | { fetchReason: string; results?: SearchResultHit[] | null }
> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const url = `${normalizedBase}${BATCH_012_MISSING_PAGES_ROUTES.searchApi}?query=${encodeURIComponent(BATCH_012_ATTENTION_SEARCH_QUERY)}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return {
        fetchReason: `expected HTTP 200, received HTTP ${status}`,
      };
    }

    const { results, reason } = parseSearchResultsJson(body);
    if (reason || results === null) {
      return {
        fetchReason: reason ?? "failed to parse attention search API results",
        results,
      };
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
 * Fetches built attention, vector, and hidden-size routes plus attention search
 * surfaces and returns batch-012 missing-pages customer-ask rows.
 */
export async function runCustomerAskMissingPagesChecks(
  baseUrl: string,
  options: RunCustomerAskMissingPagesChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const searchTimeoutMs = Math.max(timeoutMs, DEFAULT_SEARCH_PAGE_TIMEOUT_MS);
  const rows: CustomerAskConvergenceRow[] = [];

  for (const entry of ROUTE_CHECKS) {
    const url = `${normalizedBase}${entry.route}`;
    try {
      const { status, body } = await httpGetText(url, timeoutMs);
      if (status !== 200) {
        rows.push(
          buildRouteHttpFailureRow(
            entry.check,
            entry.route,
            entry.checklistRow,
            `expected HTTP 200, received HTTP ${status}`,
          ),
        );
        continue;
      }
      rows.push(entry.buildRow(body));
    } catch (error) {
      const reason =
        error instanceof FetchTimeoutError
          ? `request timed out after ${error.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error);
      rows.push(
        buildRouteHttpFailureRow(
          entry.check,
          entry.route,
          entry.checklistRow,
          reason,
        ),
      );
    }
  }

  const runSearchProbe =
    options.runSearchAttentionSnapshotProbe ??
    (async (probeBaseUrl, probeTimeoutMs) => {
      const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(probeTimeoutMs);
        return await defaultSearchAttentionSnapshotProbe(
          page,
          probeBaseUrl,
          probeTimeoutMs,
        );
      } finally {
        await browser.close();
      }
    });

  const searchProbeResult = await runSearchProbe(baseUrl, searchTimeoutMs);
  if ("reason" in searchProbeResult) {
    rows.push(buildSearchAttentionHttpFailureRow(searchProbeResult.reason));
  } else {
    rows.push(
      buildCustomerAskAttentionDiscoverableSearchRow(searchProbeResult),
    );
  }

  const fetchApiResults =
    options.fetchAttentionApiResults ?? defaultFetchAttentionApiResults;
  const apiResult = await fetchApiResults(baseUrl, timeoutMs);
  if ("fetchReason" in apiResult) {
    rows.push(
      buildCustomerAskAttentionDiscoverableApiRow(
        apiResult.results ?? null,
        apiResult.fetchReason,
      ),
    );
  } else {
    rows.push(buildCustomerAskAttentionDiscoverableApiRow(apiResult.results));
  }

  return rows;
}

export const MISSING_PAGES_POST_REPAIR_ATTENTION_API_RESULTS: SearchResultHit[] =
  [
    { url: PHASE_1_ATTENTION_MODULE_URL },
    { url: "/docs/modules/grouped-query-attention" },
  ];
