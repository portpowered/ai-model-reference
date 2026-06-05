import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import { assertHomeSearchEntryConvergence } from "./home-search-entry-convergence";

/** Checklist row for batch-008 home and header polish customer-ask inventory. */
export const HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW =
  "phase-1-home-header-polish" as const;

export const HOME_HEADER_CUSTOMER_ASK_CHECKS = {
  headerSearchEntry: {
    checkId: "home.header-search-entry",
    title: "Home exposes header-only search entry",
  },
  primaryNavNoDuplicateSearch: {
    checkId: "home.primary-nav-no-duplicate-search",
    title: "Primary navigation omits duplicate Search link",
  },
  commandKAffordance: {
    checkId: "home.command-k-affordance",
    title: "Command-K shortcut label is readable in header search trigger",
  },
  commandKHoverContrast: {
    checkId: "home.command-k-hover-contrast",
    title: "Command-K shortcut hover contrast is readable",
  },
} as const;

export const HOME_HEADER_CUSTOMER_ASK_REASONS = {
  missingPrimaryNav: 'primary navigation not found (aria-label="Primary")',
  redundantPrimaryNavSearchLink:
    "primary navigation still exposes redundant /search link alongside header search",
  missingSearchTrigger: "missing header search trigger (data-search)",
  missingKbdShortcutChips:
    "header search trigger missing readable kbd shortcut chips",
} as const;

export type HomeHeaderCustomerAskReason =
  (typeof HOME_HEADER_CUSTOMER_ASK_REASONS)[keyof typeof HOME_HEADER_CUSTOMER_ASK_REASONS];

export const HOME_HEADER_CUSTOMER_ASK_ROUTE = "/" as const;

const COMMAND_K_HOVER_MARKERS = [
  "group-hover:text-accent-foreground",
  "group-hover:bg-accent-foreground",
] as const;

function extractPrimaryNavHtml(html: string): string {
  const match = html.match(
    /<nav\b[^>]*\baria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/i,
  );
  return match?.[1] ?? "";
}

/**
 * Returns a failure reason when primary navigation still links to `/search`
 * alongside the global header search trigger.
 */
export function assertPrimaryNavNoDuplicateSearchLink(
  html: string,
): string | null {
  const navHtml = extractPrimaryNavHtml(stripHtmlScripts(html));
  if (navHtml.length === 0) {
    return HOME_HEADER_CUSTOMER_ASK_REASONS.missingPrimaryNav;
  }

  if (navHtml.includes('href="/search"')) {
    return HOME_HEADER_CUSTOMER_ASK_REASONS.redundantPrimaryNavSearchLink;
  }

  return null;
}

/**
 * Returns a failure reason when the built home HTML lacks readable Command-K
 * shortcut chips in the header search trigger.
 */
export function assertCommandKShortcutReadable(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes("data-search")) {
    return HOME_HEADER_CUSTOMER_ASK_REASONS.missingSearchTrigger;
  }

  if (!/<kbd\b/i.test(visibleHtml)) {
    return HOME_HEADER_CUSTOMER_ASK_REASONS.missingKbdShortcutChips;
  }

  return null;
}

/**
 * Hover contrast is pass when group-hover accent classes are present in markup;
 * otherwise uncertain because computed hover colors are not observable from HTML.
 */
export function evaluateCommandKHoverContrastRow(
  html: string,
): CustomerAskConvergenceRow {
  const visibleHtml = stripHtmlScripts(html);
  const hasHoverStyles = COMMAND_K_HOVER_MARKERS.some((marker) =>
    visibleHtml.includes(marker),
  );

  if (hasHoverStyles) {
    return {
      checkId: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
      title: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.title,
      status: "pass",
      route: HOME_HEADER_CUSTOMER_ASK_ROUTE,
      checklistRow: HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  }

  return {
    checkId: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
    title: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.title,
    status: "uncertain",
    route: HOME_HEADER_CUSTOMER_ASK_ROUTE,
    reason: "hover color not observable from static HTML",
    checklistRow: HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

function toPassFailRow(
  check: (typeof HOME_HEADER_CUSTOMER_ASK_CHECKS)[keyof typeof HOME_HEADER_CUSTOMER_ASK_CHECKS],
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: HOME_HEADER_CUSTOMER_ASK_ROUTE,
    reason: reason ?? undefined,
    checklistRow: HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

/**
 * Builds customer-ask convergence rows for home and header polish from built `/` HTML.
 */
export function buildCustomerAskHomeHeaderRows(
  html: string,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry,
      assertHomeSearchEntryConvergence(html),
    ),
    toPassFailRow(
      HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch,
      assertPrimaryNavNoDuplicateSearchLink(html),
    ),
    toPassFailRow(
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance,
      assertCommandKShortcutReadable(html),
    ),
    evaluateCommandKHoverContrastRow(html),
  ];
}
