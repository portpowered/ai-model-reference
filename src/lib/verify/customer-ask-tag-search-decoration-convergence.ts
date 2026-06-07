import { docsResourceCardLinkClassName } from "@/features/docs/components/list-decoration";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import {
  BATCH_012_SEARCH_PAGE_CHECKLIST_ROW,
  BATCH_012_TAG_SEARCH_DECORATION_CHECKS,
  BATCH_012_TAG_SEARCH_DECORATION_ROUTES,
  BATCH_012_TAGS_PAGE_CHECKLIST_ROW,
} from "./batch-012-tag-search-decoration-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

export const TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS = {
  missingTagResourceSections:
    "tag resource list sections not found for resource-link styling checks",
  blanketResourceLinkUnderline:
    "tag resource list links still apply blanket underline or text-decoration to nested label and meta elements",
  missingSearchResultsList:
    "search inline results list not found for list-decoration checks",
  searchInlineListDecoration:
    "search inline result items still render list-disc, list-style, or equivalent list-marker decoration outside prose",
} as const;

export type TagResourceLinkRoute =
  | typeof BATCH_012_TAG_SEARCH_DECORATION_ROUTES.tagsIndex
  | typeof BATCH_012_TAG_SEARCH_DECORATION_ROUTES.attentionLanding;

const TAG_RESOURCE_SECTION_PATTERN =
  /<section\b[^>]*\baria-labelledby="tag-(?:resources|category)-[^"]*"[^>]*>[\s\S]*?<\/section>/gi;

const TAG_RESOURCE_LINK_PATTERN = /<a\b[^>]*>[\s\S]*?<\/a>/gi;

const NESTED_LABEL_META_PATTERN =
  /<(span|p)\b[^>]*\bclass="[^"]*\b(?:font-medium|text-muted-foreground)\b[^"]*"[^>]*>/gi;

const SEARCH_RESULTS_LIST_PATTERN =
  /<ul\b[^>]*\bdata-testid="search-page-results"[^>]*>[\s\S]*?<\/ul>/i;

const LIST_MARKER_CLASS_PATTERN =
  /<(ul|ol|li)\b[^>]*\bclass="[^"]*\b(list-disc|list-decimal|list-\[[^\]]+\])\b[^"]*"[^>]*>/gi;

const INLINE_LIST_STYLE_PATTERN = /\bstyle="[^"]*\blist-style(?:-type)?\s*:/i;

function classAttrHasPersistentUnderline(classAttr: string): boolean {
  const withoutNoUnderline = classAttr.replaceAll("no-underline", "");
  return /\bunderline\b/.test(withoutNoUnderline);
}

function extractTagResourceSections(html: string): string[] {
  const visibleHtml = stripHtmlScripts(html);
  const sections = [...visibleHtml.matchAll(TAG_RESOURCE_SECTION_PATTERN)].map(
    (match) => match[0],
  );
  return sections;
}

function linkHasBlanketUnderline(linkHtml: string): boolean {
  const openTag = linkHtml.match(/^<a\b[^>]*>/i)?.[0] ?? "";
  const classAttr = openTag.match(/\bclass="([^"]*)"/i)?.[1] ?? "";
  if (classAttrHasPersistentUnderline(classAttr)) {
    return true;
  }

  NESTED_LABEL_META_PATTERN.lastIndex = 0;
  let nestedMatch: RegExpExecArray | null =
    NESTED_LABEL_META_PATTERN.exec(linkHtml);
  while (nestedMatch) {
    const nestedOpenTag = nestedMatch[0];
    const nestedClassAttr =
      nestedOpenTag.match(/\bclass="([^"]*)"/i)?.[1] ?? "";
    if (classAttrHasPersistentUnderline(nestedClassAttr)) {
      return true;
    }
    if (/\bdecoration-/.test(nestedClassAttr)) {
      return true;
    }
    nestedMatch = NESTED_LABEL_META_PATTERN.exec(linkHtml);
  }

  return false;
}

/**
 * Returns a failure reason when tag resource list links still apply blanket
 * underline styling to nested label and meta elements.
 */
export function assertTagResourceLinkNoBlanketUnderline(
  html: string,
): string | null {
  const sections = extractTagResourceSections(html);
  if (sections.length === 0) {
    return TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.missingTagResourceSections;
  }

  for (const sectionHtml of sections) {
    TAG_RESOURCE_LINK_PATTERN.lastIndex = 0;
    let linkMatch: RegExpExecArray | null =
      TAG_RESOURCE_LINK_PATTERN.exec(sectionHtml);
    while (linkMatch) {
      if (linkHasBlanketUnderline(linkMatch[0])) {
        return TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.blanketResourceLinkUnderline;
      }
      linkMatch = TAG_RESOURCE_LINK_PATTERN.exec(sectionHtml);
    }
  }

  return null;
}

function extractSearchResultsListHtml(html: string): string {
  const visibleHtml = stripHtmlScripts(html);
  return visibleHtml.match(SEARCH_RESULTS_LIST_PATTERN)?.[0] ?? "";
}

/**
 * Returns a failure reason when search inline result rows render list-marker
 * decoration outside prose regions.
 */
export function assertSearchInlineResultNoListDecoration(
  html: string,
): string | null {
  const resultsListHtml = extractSearchResultsListHtml(html);
  if (resultsListHtml.length === 0) {
    return TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.missingSearchResultsList;
  }

  if (resultsListHtml.match(LIST_MARKER_CLASS_PATTERN) !== null) {
    return TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.searchInlineListDecoration;
  }

  if (INLINE_LIST_STYLE_PATTERN.test(resultsListHtml)) {
    return TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.searchInlineListDecoration;
  }

  return null;
}

function toPassFailRow(
  check: (typeof BATCH_012_TAG_SEARCH_DECORATION_CHECKS)[keyof typeof BATCH_012_TAG_SEARCH_DECORATION_CHECKS],
  route: string,
  query: string | undefined,
  checklistRow: string,
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
 * Builds the batch-012 tag resource-link customer-ask row from built tag HTML.
 */
export function buildCustomerAskTagResourceLinkRow(
  html: string,
  route: TagResourceLinkRoute,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline,
    route,
    undefined,
    BATCH_012_TAGS_PAGE_CHECKLIST_ROW,
    assertTagResourceLinkNoBlanketUnderline(html),
  );
}

/**
 * Builds the batch-012 search inline list-decoration customer-ask row from
 * built `/search` HTML that includes rendered results markup.
 */
export function buildCustomerAskSearchInlineDecorationRow(
  html: string,
  query: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration,
    BATCH_012_TAG_SEARCH_DECORATION_ROUTES.searchPage,
    query,
    BATCH_012_SEARCH_PAGE_CHECKLIST_ROW,
    assertSearchInlineResultNoListDecoration(html),
  );
}

/** Post-repair card link class used in stub fixtures and pass-after tests. */
export const POST_REPAIR_TAG_RESOURCE_LINK_CLASS =
  docsResourceCardLinkClassName;
