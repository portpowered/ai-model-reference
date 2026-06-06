import {
  BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW,
  BATCH_011_FOLLOW_UP_SEARCH_CHECKS,
  BATCH_011_FOLLOW_UP_SEARCH_ROUTES,
} from "./batch-011-follow-up-search-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  SEARCH_SURFACE_CUSTOMER_ASK_REASONS,
  type SearchSurfaceCustomerAskQuery,
  type SearchSurfaceResultSnapshot,
} from "./customer-ask-search-surface-convergence";

export const SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS = {
  missingFirstResultRow:
    "first visible search result row markup not available for hover/selection checks",
  rowMissingGroupClass:
    "first search result row is missing group hover/selection container classes",
  metaNotEmbeddedInRow:
    "search-result-meta is not embedded inside the first result row",
  metaMissingHoverCoherence:
    "embedded search-result-meta is missing group-hover, group-focus-visible, or group-aria-selected accent foreground classes",
  metaFieldMissingTextInherit:
    "embedded search-result-meta fields are missing text-inherit for row accent inheritance",
  titleMarkMissingSelectionContrast:
    "search-result-title-mark is missing accent-safe hover/focus/selection contrast classes",
} as const;

const ROW_HOVER_COHERENCE_MARKERS = [
  "group-hover:text-accent-foreground",
  "group-focus-visible:text-accent-foreground",
  "group-aria-selected:text-fd-accent-foreground",
] as const;

const TITLE_MARK_SELECTION_CONTRAST_MARKERS = [
  "group-hover:text-accent-foreground",
  "group-focus-visible:text-accent-foreground",
  "group-aria-selected:text-fd-accent-foreground",
] as const;

const META_FIELD_TEST_IDS = [
  "search-result-summary",
  "search-result-url",
  "search-result-kind",
] as const;

const TITLE_MARK_PATTERN =
  /<[^>]*\bdata-testid="search-result-title-mark"[^>]*>/gi;

const META_OPEN_TAG_PATTERN = /<[^>]*\bdata-testid="search-result-meta"[^>]*>/i;

function metaFieldOpenTagPattern(testId: string): RegExp {
  return new RegExp(
    `<[^>]*\\bdata-testid="${testId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
    "i",
  );
}

function openingTagHasClassToken(openTag: string, token: string): boolean {
  const classAttr = openTag.match(/\bclass="([^"]*)"/i)?.[1] ?? "";
  return classAttr.split(/\s+/).includes(token);
}

function resolveSearchResultsUnavailableReason(
  snapshot: SearchSurfaceResultSnapshot,
  query: string,
): string | null {
  if (snapshot.hasEmpty && !snapshot.hasResults) {
    return `${SEARCH_SURFACE_CUSTOMER_ASK_REASONS.emptySearchResults} for query "${query}"`;
  }

  if (!snapshot.hasResults || snapshot.resultUrls.length === 0) {
    return `${SEARCH_SURFACE_CUSTOMER_ASK_REASONS.noSearchResults} for query "${query}"`;
  }

  return null;
}

/**
 * Returns a failure reason when the first visible search result row does not
 * apply hover/selection styling across embedded metadata.
 */
export function assertSearchRowHoverCoherence(
  snapshot: SearchSurfaceResultSnapshot,
  query: string,
): string | null {
  const unavailableReason = resolveSearchResultsUnavailableReason(
    snapshot,
    query,
  );
  if (unavailableReason) {
    return unavailableReason;
  }

  const rowHtml = snapshot.firstResultRowHtml;
  if (!rowHtml || rowHtml.trim().length === 0) {
    return SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.missingFirstResultRow;
  }

  const rowOpenTag = rowHtml.match(/^<[^>]+>/i)?.[0] ?? "";
  if (!/\bgroup\b/.test(rowOpenTag)) {
    return SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.rowMissingGroupClass;
  }

  const metaOpenTag = rowHtml.match(META_OPEN_TAG_PATTERN)?.[0];
  if (!metaOpenTag) {
    return SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.metaNotEmbeddedInRow;
  }

  for (const marker of ROW_HOVER_COHERENCE_MARKERS) {
    if (!metaOpenTag.includes(marker)) {
      return SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.metaMissingHoverCoherence;
    }
  }

  for (const testId of META_FIELD_TEST_IDS) {
    const fieldOpenTag = rowHtml.match(metaFieldOpenTagPattern(testId))?.[0];
    if (!fieldOpenTag) {
      continue;
    }
    if (!openingTagHasClassToken(fieldOpenTag, "text-inherit")) {
      return SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.metaFieldMissingTextInherit;
    }
  }

  return null;
}

/**
 * Returns a failure reason when matched query marks in the first result row
 * lack accent-safe selection contrast classes.
 */
export function assertSearchMatchedTextSelectionContrast(
  snapshot: SearchSurfaceResultSnapshot,
  query: string,
): string | null {
  const unavailableReason = resolveSearchResultsUnavailableReason(
    snapshot,
    query,
  );
  if (unavailableReason) {
    return unavailableReason;
  }

  const rowHtml = snapshot.firstResultRowHtml;
  if (!rowHtml || rowHtml.trim().length === 0) {
    return SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.missingFirstResultRow;
  }

  TITLE_MARK_PATTERN.lastIndex = 0;
  let markMatch: RegExpExecArray | null = TITLE_MARK_PATTERN.exec(rowHtml);
  if (!markMatch) {
    return null;
  }

  while (markMatch) {
    const markOpenTag = markMatch[0];
    for (const marker of TITLE_MARK_SELECTION_CONTRAST_MARKERS) {
      if (!markOpenTag.includes(marker)) {
        return SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.titleMarkMissingSelectionContrast;
      }
    }
    markMatch = TITLE_MARK_PATTERN.exec(rowHtml);
  }

  return null;
}

function toPassFailRow(
  check: (typeof BATCH_011_FOLLOW_UP_SEARCH_CHECKS)[keyof typeof BATCH_011_FOLLOW_UP_SEARCH_CHECKS],
  route: (typeof BATCH_011_FOLLOW_UP_SEARCH_ROUTES)[keyof typeof BATCH_011_FOLLOW_UP_SEARCH_ROUTES],
  query: SearchSurfaceCustomerAskQuery,
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route,
    query,
    reason: reason ?? undefined,
    checklistRow: BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW,
  };
}

/**
 * Builds batch-011 search page follow-up rows for one query snapshot.
 */
export function buildCustomerAskSearchPageFollowUpRowsForQuery(
  snapshot: SearchSurfaceResultSnapshot,
  query: SearchSurfaceCustomerAskQuery,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence,
      BATCH_011_FOLLOW_UP_SEARCH_ROUTES.searchPage,
      query,
      assertSearchRowHoverCoherence(snapshot, query),
    ),
    toPassFailRow(
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast,
      BATCH_011_FOLLOW_UP_SEARCH_ROUTES.searchPage,
      query,
      assertSearchMatchedTextSelectionContrast(snapshot, query),
    ),
  ];
}

/**
 * Builds batch-011 header dialog follow-up rows for one query snapshot.
 */
export function buildCustomerAskSearchDialogFollowUpRowsForQuery(
  snapshot: SearchSurfaceResultSnapshot,
  query: SearchSurfaceCustomerAskQuery,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogRowHoverCoherence,
      BATCH_011_FOLLOW_UP_SEARCH_ROUTES.headerDialog,
      query,
      assertSearchRowHoverCoherence(snapshot, query),
    ),
    toPassFailRow(
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogMatchedTextSelectionContrast,
      BATCH_011_FOLLOW_UP_SEARCH_ROUTES.headerDialog,
      query,
      assertSearchMatchedTextSelectionContrast(snapshot, query),
    ),
  ];
}

/** Post-repair search result row HTML shared by customer-ask stub probes. */
export const POST_REPAIR_SEARCH_RESULT_ROW_HTML = `
<button
  type="button"
  data-testid="search-result-row"
  class="group flex w-full flex-col text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
>
  <span class="font-medium group-hover:text-inherit group-focus-visible:text-inherit group-aria-selected:text-inherit">
    <mark
      data-testid="search-result-title-mark"
      class="rounded-sm bg-transparent font-semibold underline decoration-current/70 underline-offset-2 text-fd-primary group-hover:text-accent-foreground group-hover:decoration-accent-foreground/80 group-focus-visible:text-accent-foreground group-focus-visible:decoration-accent-foreground/80 group-aria-selected:text-fd-accent-foreground group-aria-selected:decoration-fd-accent-foreground/80"
    >GQA</mark>
  </span>
  <div
    data-testid="search-result-meta"
    class="space-y-0.5 text-sm pt-1 text-fd-muted-foreground group-hover:text-accent-foreground group-focus-visible:text-accent-foreground group-aria-selected:text-fd-accent-foreground"
  >
    <p data-testid="search-result-summary" class="line-clamp-2 text-inherit">Grouped-query attention module.</p>
    <p data-testid="search-result-url" class="truncate font-mono text-xs text-inherit">
      <span aria-hidden="true">/docs/modules/grouped-query-attention</span>
    </p>
    <p data-testid="search-result-kind" class="text-xs text-inherit">Module</p>
  </div>
</button>
`.trim();

/** Pre-repair row with group class but metadata still using detached muted field styling. */
export const PRE_REPAIR_SEARCH_RESULT_ROW_DETACHED_META_HTML = `
<button
  type="button"
  data-testid="search-result-row"
  class="group flex w-full flex-col text-left transition-colors hover:bg-accent hover:text-accent-foreground"
>
  <span class="font-medium text-foreground">
    <mark
      data-testid="search-result-title-mark"
      class="rounded-sm bg-transparent font-semibold underline text-fd-primary group-hover:text-accent-foreground group-focus-visible:text-accent-foreground group-aria-selected:text-fd-accent-foreground"
    >GQA</mark>
  </span>
  <div
    data-testid="search-result-meta"
    class="space-y-0.5 text-sm pt-1 text-fd-muted-foreground group-hover:text-accent-foreground group-focus-visible:text-accent-foreground group-aria-selected:text-fd-accent-foreground px-3 pb-2 ps-10"
  >
    <p data-testid="search-result-url" class="truncate font-mono text-xs text-fd-muted-foreground">
      <span aria-hidden="true">/docs/modules/grouped-query-attention</span>
    </p>
    <p data-testid="search-result-kind" class="text-xs text-fd-muted-foreground">Module</p>
  </div>
</button>
`.trim();

/** Pre-repair search result row HTML missing row/meta hover coherence classes. */
export const PRE_REPAIR_SEARCH_RESULT_ROW_HTML = `
<button
  type="button"
  data-testid="search-result-row"
  class="flex w-full flex-col text-left transition-colors hover:bg-accent hover:text-accent-foreground"
>
  <span class="font-medium text-foreground">
    <mark
      data-testid="search-result-title-mark"
      class="rounded-sm bg-transparent font-semibold underline text-fd-primary"
    >GQA</mark>
  </span>
  <div
    data-testid="search-result-meta"
    class="space-y-0.5 text-sm pt-1 text-fd-muted-foreground px-3 pb-2 ps-10"
  >
    <p data-testid="search-result-url" class="truncate font-mono text-xs text-fd-muted-foreground">
      <span aria-hidden="true">/docs/modules/grouped-query-attention</span>
    </p>
    <p data-testid="search-result-kind" class="text-xs text-fd-muted-foreground">Module</p>
  </div>
</button>
`.trim();
