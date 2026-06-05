import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

/** Checklist row for batch-008 tag and list styling customer-ask inventory. */
export const TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW =
  "phase-1-tag-list-styling" as const;

export const TAG_LIST_CUSTOMER_ASK_ROUTES = {
  tagsIndex: "/tags",
  attentionLanding: "/tags/attention",
} as const;

export type TagListCustomerAskRoute =
  (typeof TAG_LIST_CUSTOMER_ASK_ROUTES)[keyof typeof TAG_LIST_CUSTOMER_ASK_ROUTES];

export const TAG_LIST_CUSTOMER_ASK_CHECKS = {
  groupedListSpacing: {
    checkId: "tags.grouped-list-spacing",
    title: "Tag grouped lists avoid mt-8 flex gap-8 spacing",
  },
  attentionGroupedListSpacing: {
    checkId: "tags.attention.grouped-list-spacing",
    title: "Attention tag grouped lists avoid mt-8 flex gap-8 spacing",
  },
  listDiscNonProse: {
    checkId: "tags.list-disc",
    title: "Tag grouped lists omit list-disc outside prose",
  },
  attentionListDiscNonProse: {
    checkId: "tags.attention.list-disc",
    title: "Attention tag grouped lists omit list-disc outside prose",
  },
} as const;

export const TAG_LIST_CUSTOMER_ASK_REASONS = {
  groupedListSpacing: "grouped list still uses mt-8 flex flex-col gap-8",
  nonProseListDisc:
    "non-prose grouped list renders list-disc outside prose regions",
} as const;

const GROUPED_LIST_SPACING_PATTERN = /mt-8\s+flex\s+flex-col\s+gap-8/;

const LIST_DISC_TAG_PATTERN =
  /<(ul|ol)\b[^>]*\bclass="[^"]*\blist-disc\b[^"]*"[^>]*>/gi;

const PROSE_CONTAINER_PATTERN =
  /<(?:div|section|article)\b[^>]*\bclass="[^"]*\bprose\b[^"]*"/gi;

/**
 * Returns a failure reason when grouped tag lists still use the pre-repair
 * `mt-8 flex flex-col gap-8` spacing pattern on list root sections.
 */
export function assertGroupedListSpacingConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);
  if (GROUPED_LIST_SPACING_PATTERN.test(visibleHtml)) {
    return TAG_LIST_CUSTOMER_ASK_REASONS.groupedListSpacing;
  }
  return null;
}

function isInsideProseRegion(html: string, index: number): boolean {
  const before = html.slice(0, index);
  const proseOpens = [...before.matchAll(PROSE_CONTAINER_PATTERN)];
  if (proseOpens.length === 0) {
    return false;
  }

  const lastOpen = proseOpens[proseOpens.length - 1];
  const openIndex = lastOpen.index ?? -1;
  if (openIndex < 0) {
    return false;
  }

  const slice = html.slice(openIndex, index);
  const openTags = (slice.match(/<(?:div|section|article)\b/gi) ?? []).length;
  const closeTags = (slice.match(/<\/(?:div|section|article)>/gi) ?? []).length;
  return openTags > closeTags;
}

/**
 * Returns a failure reason when grouped resource or architecture lists render
 * `list-disc` on ul/ol elements outside prose regions.
 */
export function assertNonProseGroupedListDisc(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);
  let match: RegExpExecArray | null = LIST_DISC_TAG_PATTERN.exec(visibleHtml);

  while (match) {
    if (!isInsideProseRegion(visibleHtml, match.index)) {
      return TAG_LIST_CUSTOMER_ASK_REASONS.nonProseListDisc;
    }
    match = LIST_DISC_TAG_PATTERN.exec(visibleHtml);
  }

  return null;
}

function checksForRoute(route: TagListCustomerAskRoute): {
  spacing: (typeof TAG_LIST_CUSTOMER_ASK_CHECKS)[keyof typeof TAG_LIST_CUSTOMER_ASK_CHECKS];
  listDisc: (typeof TAG_LIST_CUSTOMER_ASK_CHECKS)[keyof typeof TAG_LIST_CUSTOMER_ASK_CHECKS];
} {
  if (route === TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding) {
    return {
      spacing: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing,
      listDisc: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse,
    };
  }

  return {
    spacing: TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing,
    listDisc: TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse,
  };
}

function toPassFailRow(
  check: (typeof TAG_LIST_CUSTOMER_ASK_CHECKS)[keyof typeof TAG_LIST_CUSTOMER_ASK_CHECKS],
  route: TagListCustomerAskRoute,
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route,
    reason: reason ?? undefined,
    checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

/**
 * Builds customer-ask convergence rows for tag list styling from built tag route HTML.
 */
export function buildCustomerAskTagListRowsForRoute(
  html: string,
  route: TagListCustomerAskRoute,
): CustomerAskConvergenceRow[] {
  const checks = checksForRoute(route);

  return [
    toPassFailRow(
      checks.spacing,
      route,
      assertGroupedListSpacingConvergence(html),
    ),
    toPassFailRow(checks.listDisc, route, assertNonProseGroupedListDisc(html)),
  ];
}

/**
 * Builds customer-ask tag list styling rows for `/tags` and `/tags/attention`.
 */
export function buildCustomerAskTagListRows(
  htmlByRoute: Partial<Record<TagListCustomerAskRoute, string>>,
): CustomerAskConvergenceRow[] {
  return [
    TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
    TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding,
  ].flatMap((route) => {
    const html = htmlByRoute[route];
    if (html === undefined) {
      return [];
    }
    return buildCustomerAskTagListRowsForRoute(html, route);
  });
}
