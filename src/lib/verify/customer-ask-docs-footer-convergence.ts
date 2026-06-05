import {
  assertDocsFooterSublabelHoverFocusCssConvergence,
  assertFooterChromeContract,
} from "@/lib/navigation/docs-page-footer-contract";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import { PHASE_1_DOCS_FOOTER_HOVER_ROUTE } from "./phase-1-docs-footer-hover-checks";

/** Checklist row for batch-009 docs footer hover/focus CSS parity. */
export const DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW =
  "phase-1-docs-footer" as const;

export const DOCS_FOOTER_CUSTOMER_ASK_ROUTE = PHASE_1_DOCS_FOOTER_HOVER_ROUTE;

export const DOCS_FOOTER_CUSTOMER_ASK_CHECKS = {
  hoverFocusParity: {
    checkId: "docs.footer-hover-focus-parity",
    title:
      "Docs footer previous/next sublabels inherit accent foreground on hover and focus-visible",
  },
} as const;

function hasFooterNavigation(html: string): boolean {
  return (
    html.includes('id="nd-page"') &&
    (html.includes("Previous Page") || html.includes("Next Page"))
  );
}

/**
 * Evaluates docs footer hover/focus CSS parity from built route HTML and bundled
 * app CSS using the shared footer chrome and CSS contract assertions.
 */
export function evaluateDocsFooterHoverFocusParityRow(
  html: string,
  bundledCss: string | null,
): CustomerAskConvergenceRow {
  const check = DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity;
  const visibleHtml = stripHtmlScripts(html);

  if (!hasFooterNavigation(visibleHtml)) {
    return {
      checkId: check.checkId,
      title: check.title,
      status: "uncertain",
      route: DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
      reason: "footer previous/next navigation not found in built HTML",
      checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  }

  if (bundledCss === null) {
    return {
      checkId: check.checkId,
      title: check.title,
      status: "uncertain",
      route: DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
      reason:
        "footer navigation present but bundled app CSS artifacts unavailable for hover/focus parity",
      checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  }

  const chromeFailureReason = assertFooterChromeContract(visibleHtml);
  if (chromeFailureReason) {
    return {
      checkId: check.checkId,
      title: check.title,
      status: "uncertain",
      route: DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
      reason: `footer navigation present but hover/focus parity not observable: ${chromeFailureReason}`,
      checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  }

  const cssFailureReason =
    assertDocsFooterSublabelHoverFocusCssConvergence(bundledCss);
  if (cssFailureReason) {
    return {
      checkId: check.checkId,
      title: check.title,
      status: "fail",
      route: DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
      reason: cssFailureReason,
      checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  }

  return {
    checkId: check.checkId,
    title: check.title,
    status: "pass",
    route: DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
    checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

/**
 * Builds customer-ask convergence rows for docs footer hover/focus CSS parity.
 */
export function buildCustomerAskDocsFooterRows(
  html: string,
  bundledCss: string | null,
): CustomerAskConvergenceRow[] {
  return [evaluateDocsFooterHoverFocusParityRow(html, bundledCss)];
}
