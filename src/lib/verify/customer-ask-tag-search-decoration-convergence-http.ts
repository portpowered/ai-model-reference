import type { Browser, Page } from "playwright";
import {
  BATCH_012_SEARCH_PAGE_CHECKLIST_ROW,
  BATCH_012_TAG_SEARCH_DECORATION_CHECKS,
  BATCH_012_TAG_SEARCH_DECORATION_ROUTES,
  BATCH_012_TAG_SEARCH_DECORATION_SEARCH_QUERIES,
  BATCH_012_TAGS_PAGE_CHECKLIST_ROW,
} from "./batch-012-tag-search-decoration-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskSearchInlineDecorationRow,
  buildCustomerAskTagResourceLinkRow,
  type TagResourceLinkRoute,
} from "./customer-ask-tag-search-decoration-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import {
  checkSearchPageQuery,
  DEFAULT_SEARCH_PAGE_TIMEOUT_MS,
} from "./phase-1-search-page-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

const TAG_RESOURCE_LINK_ROUTES: TagResourceLinkRoute[] = [
  BATCH_012_TAG_SEARCH_DECORATION_ROUTES.tagsIndex,
  BATCH_012_TAG_SEARCH_DECORATION_ROUTES.attentionLanding,
];

const SEARCH_PAGE_RESULTS_SELECTOR = '[data-testid="search-page-results"]';

export type RunCustomerAskTagSearchDecorationChecksOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
  /**
   * Test hook: when set, returns rendered `/search` results list HTML per query
   * instead of the default Playwright probe.
   */
  runSearchPageResultsHtmlProbe?: (
    baseUrl: string,
    query: string,
    timeoutMs: number,
  ) => Promise<{ html: string } | { reason: string }>;
};

function buildTagRouteHttpFailureRows(
  route: TagResourceLinkRoute,
  reason: string,
): CustomerAskConvergenceRow[] {
  const check =
    BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline;
  return [
    {
      checkId: check.checkId,
      title: check.title,
      status: "fail" as const,
      route,
      reason,
      checklistRow: BATCH_012_TAGS_PAGE_CHECKLIST_ROW,
    },
  ];
}

function buildSearchDecorationHttpFailureRow(
  query: string,
  reason: string,
): CustomerAskConvergenceRow {
  const check =
    BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration;
  return {
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route: BATCH_012_TAG_SEARCH_DECORATION_ROUTES.searchPage,
    query,
    reason,
    checklistRow: BATCH_012_SEARCH_PAGE_CHECKLIST_ROW,
  };
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

async function readSearchPageResultsListHtml(
  page: Page,
): Promise<string | null> {
  const results = page.locator(SEARCH_PAGE_RESULTS_SELECTOR);
  const count = await results.count();
  if (count === 0) {
    return null;
  }

  return results.first().evaluate((element) => element.outerHTML);
}

async function defaultSearchPageResultsHtmlProbe(
  page: Page,
  baseUrl: string,
  query: string,
  timeoutMs: number,
): Promise<{ html: string } | { reason: string }> {
  const probeReason = await checkSearchPageQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (probeReason?.includes("timed out")) {
    return { reason: probeReason };
  }

  const resultsHtml = await readSearchPageResultsListHtml(page);
  if (!resultsHtml) {
    return {
      reason: `no search results rendered on /search for query "${query}"`,
    };
  }

  return { html: `<div>${resultsHtml}</div>` };
}

/**
 * Fetches built tag routes and `/search` query results, returning batch-012 tag
 * resource-link and search inline list-decoration customer-ask rows.
 */
export async function runCustomerAskTagSearchDecorationChecks(
  baseUrl: string,
  options: RunCustomerAskTagSearchDecorationChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const searchTimeoutMs = Math.max(timeoutMs, DEFAULT_SEARCH_PAGE_TIMEOUT_MS);
  const rows: CustomerAskConvergenceRow[] = [];

  for (const route of TAG_RESOURCE_LINK_ROUTES) {
    const url = `${normalizedBase}${route}`;
    try {
      const { status, body } = await httpGetText(url, timeoutMs);
      if (status !== 200) {
        rows.push(
          ...buildTagRouteHttpFailureRows(
            route,
            `expected HTTP 200, received HTTP ${status}`,
          ),
        );
        continue;
      }
      rows.push(buildCustomerAskTagResourceLinkRow(body, route));
    } catch (error) {
      const reason =
        error instanceof FetchTimeoutError
          ? `request timed out after ${error.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error);
      rows.push(...buildTagRouteHttpFailureRows(route, reason));
    }
  }

  const runSearchProbe =
    options.runSearchPageResultsHtmlProbe ??
    (async (probeBaseUrl, query, probeTimeoutMs) => {
      const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(probeTimeoutMs);
        return await defaultSearchPageResultsHtmlProbe(
          page,
          probeBaseUrl,
          query,
          probeTimeoutMs,
        );
      } finally {
        await browser.close();
      }
    });

  for (const query of BATCH_012_TAG_SEARCH_DECORATION_SEARCH_QUERIES) {
    const probeResult = await runSearchProbe(baseUrl, query, searchTimeoutMs);
    if ("reason" in probeResult) {
      rows.push(buildSearchDecorationHttpFailureRow(query, probeResult.reason));
      continue;
    }

    rows.push(
      buildCustomerAskSearchInlineDecorationRow(probeResult.html, query),
    );
  }

  return rows;
}
