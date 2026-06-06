import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskSearchDialogFollowUpRowsForQuery,
  buildCustomerAskSearchPageFollowUpRowsForQuery,
} from "./customer-ask-search-follow-up-convergence";
import {
  PHASE_1_GROUPED_QUERY_ATTENTION_URL,
  type SearchResultHit,
} from "./phase-1-search-checks";
import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";

/** Checklist row for batch-008 search surface customer-ask inventory. */
export const SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW =
  "phase-1-search-surface" as const;

export const SEARCH_SURFACE_CUSTOMER_ASK_ROUTES = {
  searchPage: "/search",
  searchApi: "/api/search",
  headerDialog: "header-dialog",
} as const;

export type SearchSurfaceCustomerAskRoute =
  (typeof SEARCH_SURFACE_CUSTOMER_ASK_ROUTES)[keyof typeof SEARCH_SURFACE_CUSTOMER_ASK_ROUTES];

export const SEARCH_SURFACE_CUSTOMER_ASK_CHECKS = {
  pagePageLevelHits: {
    checkId: "search.page.page-level-hits",
    title: "Search page lists canonical page-level hits without fragment URLs",
  },
  pageNoMatchedTags: {
    checkId: "search.page.no-matched-tags",
    title: "Search page omits search-result-matched-tags chips",
  },
  dialogNoMatchedTags: {
    checkId: "search.dialog.no-matched-tags",
    title: "Header search dialog omits search-result-matched-tags chips",
  },
  apiGqaCanonicalFirstHit: {
    checkId: "search.api.gqa-canonical-first-hit",
    title:
      "GQA API search returns canonical grouped-query-attention page first",
  },
} as const;

export const SEARCH_SURFACE_CUSTOMER_ASK_REASONS = {
  firstResultFragment: "first visible result URL includes a hash fragment",
  duplicatePageRows: "multiple result rows duplicate one canonical page URL",
  matchedTagsVisible: "search-result-matched-tags is visible in results",
  apiGqaFragmentSpam:
    "GQA API results include fragment deep-link spam instead of a canonical page hit first",
  noSearchResults: "no search results rendered",
  emptySearchResults: "empty results state",
} as const;

export type SearchSurfaceResultSnapshot = {
  resultUrls: readonly string[];
  matchedTagsVisible: boolean;
  hasResults: boolean;
  hasEmpty: boolean;
  /** Outer HTML of the first visible search-result-row when captured by probes. */
  firstResultRowHtml?: string | null;
};

export const SEARCH_SURFACE_CUSTOMER_ASK_QUERIES = PHASE_1_SEARCH_PAGE_QUERIES;

export type SearchSurfaceCustomerAskQuery =
  (typeof SEARCH_SURFACE_CUSTOMER_ASK_QUERIES)[number];

function toPassFailRow(
  check: (typeof SEARCH_SURFACE_CUSTOMER_ASK_CHECKS)[keyof typeof SEARCH_SURFACE_CUSTOMER_ASK_CHECKS],
  route: SearchSurfaceCustomerAskRoute,
  query: string | undefined,
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route,
    query,
    reason: reason ?? undefined,
    checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

/**
 * Returns a failure reason when `/search` or header dialog results are not
 * page-level hits: first URL has a hash fragment or multiple rows share a page.
 */
export function assertSearchPageLevelHits(
  snapshot: SearchSurfaceResultSnapshot,
  query: string,
): string | null {
  if (snapshot.hasEmpty && !snapshot.hasResults) {
    return `${SEARCH_SURFACE_CUSTOMER_ASK_REASONS.emptySearchResults} for query "${query}"`;
  }

  if (!snapshot.hasResults || snapshot.resultUrls.length === 0) {
    return `${SEARCH_SURFACE_CUSTOMER_ASK_REASONS.noSearchResults} for query "${query}"`;
  }

  const firstUrl = snapshot.resultUrls[0];
  if (firstUrl?.includes("#")) {
    return SEARCH_SURFACE_CUSTOMER_ASK_REASONS.firstResultFragment;
  }

  const bases = snapshot.resultUrls.map(pageBaseUrl);
  if (new Set(bases).size !== bases.length) {
    return SEARCH_SURFACE_CUSTOMER_ASK_REASONS.duplicatePageRows;
  }

  return null;
}

/**
 * Returns a failure reason when matched-tag chips are visible in search results.
 */
export function assertSearchNoMatchedTags(
  snapshot: SearchSurfaceResultSnapshot,
): string | null {
  if (snapshot.matchedTagsVisible) {
    return SEARCH_SURFACE_CUSTOMER_ASK_REASONS.matchedTagsVisible;
  }

  return null;
}

/**
 * Returns a failure reason when GQA `/api/search` results are fragment spam or
 * do not rank the canonical grouped-query-attention page first.
 */
export function assertApiGqaCanonicalPageHit(
  results: readonly SearchResultHit[],
): string | null {
  if (results.length === 0) {
    return "expected at least one GQA search hit";
  }

  const first = results[0];
  if (!first || first.url !== PHASE_1_GROUPED_QUERY_ATTENTION_URL) {
    if (first?.url.includes("#")) {
      return SEARCH_SURFACE_CUSTOMER_ASK_REASONS.apiGqaFragmentSpam;
    }
    return `first GQA hit must be ${PHASE_1_GROUPED_QUERY_ATTENTION_URL}, got ${first?.url ?? "none"}`;
  }

  if (results.some((result) => result.url.includes("#"))) {
    return SEARCH_SURFACE_CUSTOMER_ASK_REASONS.apiGqaFragmentSpam;
  }

  const bases = results.map((result) => pageBaseUrl(result.url));
  if (new Set(bases).size !== bases.length) {
    return SEARCH_SURFACE_CUSTOMER_ASK_REASONS.apiGqaFragmentSpam;
  }

  return null;
}

/**
 * Builds customer-ask rows for one `/search` query from a DOM snapshot.
 */
export function buildCustomerAskSearchPageRowsForQuery(
  snapshot: SearchSurfaceResultSnapshot,
  query: SearchSurfaceCustomerAskQuery,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits,
      SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.searchPage,
      query,
      assertSearchPageLevelHits(snapshot, query),
    ),
    toPassFailRow(
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags,
      SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.searchPage,
      query,
      assertSearchNoMatchedTags(snapshot),
    ),
    ...buildCustomerAskSearchPageFollowUpRowsForQuery(snapshot, query),
  ];
}

/**
 * Builds customer-ask rows for one header dialog query from a DOM snapshot.
 */
export function buildCustomerAskSearchDialogRowsForQuery(
  snapshot: SearchSurfaceResultSnapshot,
  query: SearchSurfaceCustomerAskQuery,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags,
      SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.headerDialog,
      query,
      assertSearchNoMatchedTags(snapshot),
    ),
    ...buildCustomerAskSearchDialogFollowUpRowsForQuery(snapshot, query),
  ];
}

/**
 * Builds the customer-ask GQA API search row from `/api/search` JSON hits.
 */
export function buildCustomerAskSearchApiGqaRow(
  results: readonly SearchResultHit[] | null,
  fetchReason?: string,
): CustomerAskConvergenceRow {
  let reason: string | null = null;
  if (fetchReason) {
    reason = fetchReason;
  } else if (results === null) {
    reason = "failed to parse GQA search results";
  } else {
    reason = assertApiGqaCanonicalPageHit(results);
  }

  return toPassFailRow(
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit,
    SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.searchApi,
    "GQA",
    reason,
  );
}
