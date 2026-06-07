import { type Browser, chromium, type Page } from "playwright";
import type { SearchSurfaceResultSnapshot } from "./customer-ask-search-surface-convergence";
import {
  readSearchDialogSurfaceSnapshot,
  readSearchPageSurfaceSnapshot,
} from "./customer-ask-search-surface-convergence-http";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import {
  buildStaticRegressionGqaModuleRouteRow,
  buildStaticRegressionHomeRouteRow,
  buildStaticRegressionSearchDialogRowsForQuery,
  buildStaticRegressionSearchPageRowsForQuery,
  STATIC_REGRESSION_CHECKS,
  STATIC_REGRESSION_QUERIES,
  STATIC_REGRESSION_ROUTES,
  type StaticRegressionCheckRow,
  type StaticRegressionQuery,
} from "./phase-1-github-pages-static-regression";
import {
  checkSearchDialogQuery,
  DEFAULT_SEARCH_DIALOG_TIMEOUT_MS,
} from "./phase-1-search-dialog-checks";
import {
  checkSearchPageQuery,
  DEFAULT_SEARCH_PAGE_TIMEOUT_MS,
} from "./phase-1-search-page-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunPhase1GitHubPagesStaticRegressionChecksOptions = {
  timeoutMs?: number;
  queries?: readonly StaticRegressionQuery[];
  launchBrowser?: () => Promise<Browser>;
  runSearchPageQueryCheck?: (
    baseUrl: string,
    query: StaticRegressionQuery,
    timeoutMs: number,
  ) => Promise<SearchSurfaceResultSnapshot | { reason: string }>;
  runSearchDialogQueryCheck?: (
    baseUrl: string,
    query: StaticRegressionQuery,
    timeoutMs: number,
  ) => Promise<SearchSurfaceResultSnapshot | { reason: string }>;
  fetchHomeHtml?: (
    baseUrl: string,
    timeoutMs: number,
  ) => Promise<string | { reason: string }>;
  fetchGqaModuleHtml?: (
    baseUrl: string,
    timeoutMs: number,
  ) => Promise<string | { reason: string }>;
};

function buildProbeFailureRows(
  checkIds: string[],
  route: (typeof STATIC_REGRESSION_ROUTES)[keyof typeof STATIC_REGRESSION_ROUTES],
  query: string | undefined,
  reason: string,
): StaticRegressionCheckRow[] {
  return checkIds.map((checkId) => {
    const check = Object.values(STATIC_REGRESSION_CHECKS).find(
      (entry) => entry.checkId === checkId,
    );
    return {
      checkId,
      title: check?.title ?? checkId,
      status: "fail" as const,
      route,
      query,
      reason,
      checklistRow: "phase-1-github-pages-static-regression",
    };
  });
}

function pageCheckIdsForQuery(): string[] {
  return [
    STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
    STATIC_REGRESSION_CHECKS.searchPageNoMatchedTags.checkId,
  ];
}

function dialogCheckIdsForQuery(): string[] {
  return [
    STATIC_REGRESSION_CHECKS.searchDialogPageLevelHits.checkId,
    STATIC_REGRESSION_CHECKS.searchDialogNoMatchedTags.checkId,
  ];
}

function routeCheckIdsForHome(): string[] {
  return [STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.checkId];
}

function routeCheckIdsForGqaModule(): string[] {
  return [STATIC_REGRESSION_CHECKS.gqaModulePresentation.checkId];
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function defaultSearchPageQueryCheck(
  page: Page,
  baseUrl: string,
  query: StaticRegressionQuery,
  timeoutMs: number,
): Promise<SearchSurfaceResultSnapshot | { reason: string }> {
  const probeReason = await checkSearchPageQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (probeReason) {
    return { reason: probeReason };
  }

  return readSearchPageSurfaceSnapshot(page);
}

async function defaultSearchDialogQueryCheck(
  page: Page,
  baseUrl: string,
  query: StaticRegressionQuery,
  timeoutMs: number,
): Promise<SearchSurfaceResultSnapshot | { reason: string }> {
  const probeReason = await checkSearchDialogQuery(
    page,
    baseUrl,
    query,
    timeoutMs,
  );
  if (probeReason) {
    return { reason: probeReason };
  }

  const dialog = page.getByRole("dialog", { name: "Search" });
  return readSearchDialogSurfaceSnapshot(dialog);
}

async function defaultFetchHomeHtml(
  baseUrl: string,
  timeoutMs: number,
): Promise<string | { reason: string }> {
  const url = `${normalizeVerifyBaseUrl(baseUrl)}${STATIC_REGRESSION_ROUTES.home}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return { reason: `expected HTTP 200, received HTTP ${status}` };
    }
    return body;
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return { reason };
  }
}

async function defaultFetchGqaModuleHtml(
  baseUrl: string,
  timeoutMs: number,
): Promise<string | { reason: string }> {
  const url = `${normalizeVerifyBaseUrl(baseUrl)}${STATIC_REGRESSION_ROUTES.gqaModule}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return { reason: `expected HTTP 200, received HTTP ${status}` };
    }
    return body;
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return { reason };
  }
}

/**
 * Runs Phase 1 search and route regression probes against a static export
 * server base URL and returns batch-014 static-regression evidence rows.
 */
export async function runPhase1GitHubPagesStaticRegressionChecks(
  baseUrl: string,
  options: RunPhase1GitHubPagesStaticRegressionChecksOptions = {},
): Promise<StaticRegressionCheckRow[]> {
  const queries = options.queries ?? STATIC_REGRESSION_QUERIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const pageTimeoutMs = Math.max(timeoutMs, DEFAULT_SEARCH_PAGE_TIMEOUT_MS);
  const dialogTimeoutMs = Math.max(timeoutMs, DEFAULT_SEARCH_DIALOG_TIMEOUT_MS);
  const rows: StaticRegressionCheckRow[] = [];

  const runPageCheck =
    options.runSearchPageQueryCheck ??
    (async (probeBaseUrl, query, probeTimeoutMs) => {
      const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(probeTimeoutMs);
        return await defaultSearchPageQueryCheck(
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
        return await defaultSearchDialogQueryCheck(
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
          STATIC_REGRESSION_ROUTES.searchPage,
          query,
          pageResult.reason,
        ),
      );
      continue;
    }

    rows.push(
      ...buildStaticRegressionSearchPageRowsForQuery(pageResult, query),
    );
  }

  for (const query of queries) {
    const dialogResult = await runDialogCheck(baseUrl, query, dialogTimeoutMs);
    if ("reason" in dialogResult) {
      rows.push(
        ...buildProbeFailureRows(
          dialogCheckIdsForQuery(),
          STATIC_REGRESSION_ROUTES.headerDialog,
          query,
          dialogResult.reason,
        ),
      );
      continue;
    }

    rows.push(
      ...buildStaticRegressionSearchDialogRowsForQuery(dialogResult, query),
    );
  }

  const fetchHomeHtml = options.fetchHomeHtml ?? defaultFetchHomeHtml;
  const homeResult = await fetchHomeHtml(baseUrl, timeoutMs);
  if (typeof homeResult !== "string") {
    rows.push(
      ...buildProbeFailureRows(
        routeCheckIdsForHome(),
        STATIC_REGRESSION_ROUTES.home,
        undefined,
        homeResult.reason,
      ),
    );
  } else {
    rows.push(buildStaticRegressionHomeRouteRow(homeResult));
  }

  const fetchGqaModuleHtml =
    options.fetchGqaModuleHtml ?? defaultFetchGqaModuleHtml;
  const gqaResult = await fetchGqaModuleHtml(baseUrl, timeoutMs);
  if (typeof gqaResult !== "string") {
    rows.push(
      ...buildProbeFailureRows(
        routeCheckIdsForGqaModule(),
        STATIC_REGRESSION_ROUTES.gqaModule,
        undefined,
        gqaResult.reason,
      ),
    );
  } else {
    rows.push(buildStaticRegressionGqaModuleRouteRow(gqaResult));
  }

  return rows;
}
