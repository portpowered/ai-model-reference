import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";

/**
 * Removed inline home search section heading (formerly `home.searchSectionTitle`).
 * Must not appear in the article body alongside the global header search trigger.
 */
export const REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE = "Search the reference";

/** Stable failure reasons for home single-search-entry convergence checks. */
export const HOME_SEARCH_ENTRY_CONVERGENCE_REASONS = {
  missingModelAtlas: 'missing home title marker ("Model Atlas")',
  missingGlobalSearchEntry:
    "missing global header search entry (data-search trigger)",
  redundantArticleSearchPageLink:
    "redundant inline home search handoff link to /search in article",
  redundantInlineSearchHeading: `redundant inline home search section heading (${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE})`,
  redundantInlineSearchSection:
    'redundant inline home search section anchor (id="search")',
  redundantInlineSearchTrigger:
    "redundant inline home search UI in article (data-search)",
} as const;

export type HomeSearchEntryConvergenceReason =
  (typeof HOME_SEARCH_ENTRY_CONVERGENCE_REASONS)[keyof typeof HOME_SEARCH_ENTRY_CONVERGENCE_REASONS];

function extractArticleHtml(html: string): string {
  const match = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  return match?.[1] ?? "";
}

function assertRedundantInlineHomeSearch(articleHtml: string): string | null {
  if (articleHtml.includes('href="/search"')) {
    return HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantArticleSearchPageLink;
  }

  if (articleHtml.includes(REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE)) {
    return HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchHeading;
  }

  if (articleHtml.includes('id="search"')) {
    return HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchSection;
  }

  if (articleHtml.includes("data-search")) {
    return HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchTrigger;
  }

  return null;
}

/**
 * Returns the first home search-entry convergence failure reason, or null when
 * HTML satisfies the header-only contract: Model Atlas, global header search,
 * and no redundant inline home search handoff or section in the article.
 */
export function assertHomeSearchEntryConvergence(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes("Model Atlas")) {
    return HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.missingModelAtlas;
  }

  if (!visibleHtml.includes("data-search")) {
    return HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.missingGlobalSearchEntry;
  }

  const articleHtml = extractArticleHtml(visibleHtml);
  if (articleHtml.length > 0) {
    const redundantReason = assertRedundantInlineHomeSearch(articleHtml);
    if (redundantReason) {
      return redundantReason;
    }
  } else {
    const redundantReason = assertRedundantInlineHomeSearch(visibleHtml);
    if (redundantReason) {
      return redundantReason;
    }
  }

  return null;
}
