export const CUSTOMER_ASK_CONSOLIDATION_DOMAINS = [
  "docsShell",
  "searchSurface",
  "staticExport",
  "modulePage",
  "glossaryPage",
  "navigation",
  "contentRegistry",
  "accessibility",
  "deployPosture",
] as const;

export type CustomerAskConsolidationDomain =
  (typeof CUSTOMER_ASK_CONSOLIDATION_DOMAINS)[number];

/**
 * Stable domain labels used to keep phase/customer-ask checks grouped by
 * behavior instead of by historical batch number.
 */
export function customerAskDomainForCheckId(
  checkId: string,
): CustomerAskConsolidationDomain | undefined {
  if (checkId.startsWith("search.")) {
    return "searchSurface";
  }
  if (checkId.startsWith("module.")) {
    return "modulePage";
  }
  if (checkId.startsWith("glossary.")) {
    return "glossaryPage";
  }
  if (
    checkId.startsWith("home.") ||
    checkId.startsWith("nav.") ||
    checkId.startsWith("tags.") ||
    checkId.startsWith("pages.") ||
    checkId.startsWith("docs.")
  ) {
    return "navigation";
  }
  return undefined;
}
