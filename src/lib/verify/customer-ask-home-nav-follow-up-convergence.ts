import {
  extractNdSidebarHtml,
  stripHtmlScripts,
} from "@/lib/navigation/docs-sidebar-contract";
import {
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS,
  BATCH_011_FOLLOW_UP_HOME_ROUTE,
  BATCH_011_FOLLOW_UP_NAV_ROUTE,
} from "./batch-011-follow-up-home-nav-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "./home-search-entry-convergence";

export const HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS = {
  excessBrushHeaderMargin:
    "home brush header still carries excess bottom margin (for example mb-8)",
  verboseInlineSearchHeading: `verbose inline home search section heading (${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE})`,
  verboseInlineSearchSection:
    'verbose inline home search section anchor (id="search")',
  browseListDisc: "home browse list renders list-disc outside prose regions",
  persistentBrowseLinkUnderline:
    "home browse links still expose persistent underline styling outside prose",
  missingDocsSidebar: 'docs sidebar not found (id="nd-sidebar")',
  brokenThemeTogglePresent:
    "docs left navigation still exposes non-working theme toggle control",
} as const;

const BROWSE_LIST_DISC_PATTERN =
  /<(ul|ol)\b[^>]*\bclass="[^"]*\blist-disc\b[^"]*"[^>]*>/gi;

const BROWSE_LINK_PATTERN = /<a\b[^>]*>/gi;

function extractArticleHtml(html: string): string {
  const match = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  return match?.[1] ?? "";
}

function extractBrowseSectionHtml(html: string): string {
  const articleHtml = extractArticleHtml(stripHtmlScripts(html));
  const browseMatch = articleHtml.match(
    /<section\b[^>]*\bid="browse"[^>]*>([\s\S]*?)<\/section>/i,
  );
  if (browseMatch?.[1]) {
    return browseMatch[1];
  }

  const headingIndex = articleHtml.indexOf('id="home-browse-heading"');
  if (headingIndex >= 0) {
    return articleHtml.slice(headingIndex);
  }

  return "";
}

/**
 * Returns a failure reason when the home brush header or article body still
 * carries pre-repair brevity regressions.
 */
export function assertHomeBrevityConvergence(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);
  const articleHtml = extractArticleHtml(visibleHtml);

  const brushHeaderMatch = articleHtml.match(/<header\b[^>]*>/i);
  if (brushHeaderMatch && /\bmb-8\b/.test(brushHeaderMatch[0])) {
    return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.excessBrushHeaderMargin;
  }

  if (articleHtml.includes(REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE)) {
    return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.verboseInlineSearchHeading;
  }

  if (articleHtml.includes('id="search"')) {
    return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.verboseInlineSearchSection;
  }

  return null;
}

/**
 * Returns a failure reason when home browse links still render disc bullets or
 * persistent underlines outside prose regions.
 */
export function assertHomeBrowseLinksConvergence(html: string): string | null {
  const browseHtml = extractBrowseSectionHtml(html);
  if (browseHtml.length === 0) {
    return null;
  }

  if (browseHtml.match(BROWSE_LIST_DISC_PATTERN) !== null) {
    return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.browseListDisc;
  }

  BROWSE_LINK_PATTERN.lastIndex = 0;
  let linkMatch: RegExpExecArray | null = BROWSE_LINK_PATTERN.exec(browseHtml);
  while (linkMatch) {
    const classAttr = linkMatch[0].match(/\bclass="([^"]*)"/i)?.[1] ?? "";
    const withoutNoUnderline = classAttr.replaceAll("no-underline", "");
    if (/\bunderline\b/.test(withoutNoUnderline)) {
      return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.persistentBrowseLinkUnderline;
    }
    linkMatch = BROWSE_LINK_PATTERN.exec(browseHtml);
  }

  return null;
}

/**
 * Returns a failure reason when the docs left navigation still exposes a broken
 * theme toggle control.
 */
export function assertNavNoBrokenThemeToggleConvergence(
  html: string,
): string | null {
  const sidebarHtml = extractNdSidebarHtml(stripHtmlScripts(html));
  if (sidebarHtml.length === 0) {
    return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.missingDocsSidebar;
  }

  if (sidebarHtml.includes("data-theme-toggle")) {
    return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.brokenThemeTogglePresent;
  }

  if (/aria-label="Toggle Theme"/i.test(sidebarHtml)) {
    return HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.brokenThemeTogglePresent;
  }

  return null;
}

function toPassFailRow(
  check: (typeof BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS)[keyof typeof BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS],
  route: string,
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route,
    reason: reason ?? undefined,
    checklistRow: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
  };
}

/**
 * Builds batch-011 home brevity and browse-link follow-up rows from built `/` HTML.
 */
export function buildCustomerAskHomeFollowUpRows(
  homeHtml: string,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity,
      BATCH_011_FOLLOW_UP_HOME_ROUTE,
      assertHomeBrevityConvergence(homeHtml),
    ),
    toPassFailRow(
      BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks,
      BATCH_011_FOLLOW_UP_HOME_ROUTE,
      assertHomeBrowseLinksConvergence(homeHtml),
    ),
  ];
}

/**
 * Builds the batch-011 docs-shell nav theme follow-up row from built module HTML.
 */
export function buildCustomerAskNavThemeFollowUpRow(
  docsShellHtml: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle,
    BATCH_011_FOLLOW_UP_NAV_ROUTE,
    assertNavNoBrokenThemeToggleConvergence(docsShellHtml),
  );
}

/**
 * Builds all batch-011 home and nav follow-up rows for customer-ask reporting.
 */
export function buildCustomerAskHomeNavFollowUpRows(input: {
  homeHtml: string;
  navHtml: string;
}): CustomerAskConvergenceRow[] {
  return [
    ...buildCustomerAskHomeFollowUpRows(input.homeHtml),
    buildCustomerAskNavThemeFollowUpRow(input.navHtml),
  ];
}
