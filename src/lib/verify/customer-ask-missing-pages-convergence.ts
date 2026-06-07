import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import {
  BATCH_012_ATTENTION_SEARCH_QUERY,
  BATCH_012_MISSING_PAGES_CHECKS,
  BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
  BATCH_012_MISSING_PAGES_MODULE_CHECKLIST_ROW,
  BATCH_012_MISSING_PAGES_ROUTES,
  BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW,
} from "./batch-012-missing-pages-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import type { SearchSurfaceResultSnapshot } from "./customer-ask-search-surface-convergence";
import {
  assertCanonicalPageLevelApiResults,
  PHASE_1_ATTENTION_MODULE_URL,
  type SearchResultHit,
} from "./phase-1-search-checks";

export const MISSING_PAGES_ATTENTION_REGISTRY_ID = "module.attention" as const;
export const MISSING_PAGES_VECTOR_REGISTRY_ID = "concept.vector" as const;
export const MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID =
  "concept.hidden-size" as const;

export const MISSING_PAGES_CUSTOMER_ASK_REASONS = {
  missingAttentionTitle: "attention module page missing expected title marker",
  missingAttentionRegistry:
    "attention module page missing module.attention registry marker",
  missingVectorTitle: "vector glossary page missing expected title marker",
  missingVectorRegistry:
    "vector glossary page missing concept.vector registry marker",
  missingHiddenSizeTitle:
    "hidden size glossary page missing expected title marker",
  missingHiddenSizeRegistry:
    "hidden size glossary page missing concept.hidden-size registry marker",
  emptySearchResults: "empty results state",
  noSearchResults: "no search results rendered",
  missingAttentionSearchHit:
    "search results missing canonical page-level attention module hit",
  apiNoResults: "expected at least one attention search API hit",
} as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function htmlHasRegistryMarker(html: string, registryId: string): boolean {
  const pattern = new RegExp(
    `data-registry-id="${escapeRegExp(registryId)}"`,
    "i",
  );
  return pattern.test(html);
}

function toPassFailRow(
  check: (typeof BATCH_012_MISSING_PAGES_CHECKS)[keyof typeof BATCH_012_MISSING_PAGES_CHECKS],
  route: string,
  checklistRow: string,
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
    checklistRow,
  };
}

/**
 * Returns a failure reason when built attention module HTML lacks reader-facing
 * registry or title markers expected by the Phase 1 route harness.
 */
export function assertAttentionRoutePage(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes("Attention")) {
    return MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionTitle;
  }

  if (
    !htmlHasRegistryMarker(visibleHtml, MISSING_PAGES_ATTENTION_REGISTRY_ID)
  ) {
    return MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionRegistry;
  }

  return null;
}

/**
 * Returns a failure reason when built vector glossary HTML lacks reader-facing
 * registry or title markers expected by the Phase 1 route harness.
 */
export function assertVectorRoutePage(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes("Vector")) {
    return MISSING_PAGES_CUSTOMER_ASK_REASONS.missingVectorTitle;
  }

  if (!htmlHasRegistryMarker(visibleHtml, MISSING_PAGES_VECTOR_REGISTRY_ID)) {
    return MISSING_PAGES_CUSTOMER_ASK_REASONS.missingVectorRegistry;
  }

  return null;
}

/**
 * Returns a failure reason when built hidden-size glossary HTML lacks
 * reader-facing registry or title markers expected by the Phase 1 route harness.
 */
export function assertHiddenSizeRoutePage(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes("Hidden Size")) {
    return MISSING_PAGES_CUSTOMER_ASK_REASONS.missingHiddenSizeTitle;
  }

  if (
    !htmlHasRegistryMarker(visibleHtml, MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID)
  ) {
    return MISSING_PAGES_CUSTOMER_ASK_REASONS.missingHiddenSizeRegistry;
  }

  return null;
}

function resultsIncludeAttentionModule(urls: readonly string[]): boolean {
  return urls.some((url) => pageBaseUrl(url) === PHASE_1_ATTENTION_MODULE_URL);
}

function resultsIncludeAttentionModuleHits(
  results: readonly SearchResultHit[],
): boolean {
  return results.some(
    (result) => pageBaseUrl(result.url) === PHASE_1_ATTENTION_MODULE_URL,
  );
}

/**
 * Returns a failure reason when `/search` results for the attention query omit a
 * canonical page-level attention module hit or include fragment-only URLs.
 */
export function assertAttentionDiscoverableFromSearchSnapshot(
  snapshot: SearchSurfaceResultSnapshot,
  query: string = BATCH_012_ATTENTION_SEARCH_QUERY,
): string | null {
  if (snapshot.hasEmpty && !snapshot.hasResults) {
    return `${MISSING_PAGES_CUSTOMER_ASK_REASONS.emptySearchResults} for query "${query}"`;
  }

  if (!snapshot.hasResults || snapshot.resultUrls.length === 0) {
    return `${MISSING_PAGES_CUSTOMER_ASK_REASONS.noSearchResults} for query "${query}"`;
  }

  const canonicalReason = assertCanonicalPageLevelApiResults(
    snapshot.resultUrls.map((url) => ({ url })),
  );
  if (canonicalReason) {
    return canonicalReason;
  }

  if (!resultsIncludeAttentionModule(snapshot.resultUrls)) {
    return `${MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionSearchHit} (${PHASE_1_ATTENTION_MODULE_URL})`;
  }

  return null;
}

/**
 * Returns a failure reason when `/api/search` attention hits omit a canonical
 * page-level attention module result or include fragment-only URLs.
 */
export function assertAttentionDiscoverableFromApiResults(
  results: readonly SearchResultHit[],
): string | null {
  if (results.length === 0) {
    return MISSING_PAGES_CUSTOMER_ASK_REASONS.apiNoResults;
  }

  const canonicalReason = assertCanonicalPageLevelApiResults(results);
  if (canonicalReason) {
    return canonicalReason;
  }

  if (!resultsIncludeAttentionModuleHits(results)) {
    return `${MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionSearchHit} (${PHASE_1_ATTENTION_MODULE_URL})`;
  }

  return null;
}

export function buildCustomerAskAttentionRouteRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_MISSING_PAGES_CHECKS.attentionRoute,
    BATCH_012_MISSING_PAGES_ROUTES.attentionModule,
    BATCH_012_MISSING_PAGES_MODULE_CHECKLIST_ROW,
    undefined,
    assertAttentionRoutePage(html),
  );
}

export function buildCustomerAskVectorRouteRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_MISSING_PAGES_CHECKS.vectorRoute,
    BATCH_012_MISSING_PAGES_ROUTES.vectorGlossary,
    BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
    undefined,
    assertVectorRoutePage(html),
  );
}

export function buildCustomerAskHiddenSizeRouteRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_MISSING_PAGES_CHECKS.hiddenSizeRoute,
    BATCH_012_MISSING_PAGES_ROUTES.hiddenSizeGlossary,
    BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
    undefined,
    assertHiddenSizeRoutePage(html),
  );
}

export function buildCustomerAskAttentionDiscoverableSearchRow(
  snapshot: SearchSurfaceResultSnapshot,
  query: string = BATCH_012_ATTENTION_SEARCH_QUERY,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable,
    BATCH_012_MISSING_PAGES_ROUTES.searchPage,
    BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW,
    query,
    assertAttentionDiscoverableFromSearchSnapshot(snapshot, query),
  );
}

export function buildCustomerAskAttentionDiscoverableApiRow(
  results: readonly SearchResultHit[] | null,
  fetchReason?: string,
): CustomerAskConvergenceRow {
  let reason: string | null = null;
  if (fetchReason) {
    reason = fetchReason;
  } else if (results === null) {
    reason = "failed to parse attention search API results";
  } else {
    reason = assertAttentionDiscoverableFromApiResults(results);
  }

  return toPassFailRow(
    BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable,
    BATCH_012_MISSING_PAGES_ROUTES.searchApi,
    BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW,
    BATCH_012_ATTENTION_SEARCH_QUERY,
    reason,
  );
}
