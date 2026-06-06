import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import {
  DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS,
} from "./customer-ask-docs-footer-convergence";
import {
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  GLOSSARY_CUSTOMER_ASK_CHECKS,
} from "./customer-ask-glossary-convergence";
import {
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
  GQA_MODULE_CUSTOMER_ASK_CHECKS,
} from "./customer-ask-gqa-module-convergence";
import {
  HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW,
  HOME_HEADER_CUSTOMER_ASK_CHECKS,
} from "./customer-ask-home-header-convergence";
import {
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKS,
  SEARCH_SURFACE_CUSTOMER_ASK_QUERIES,
} from "./customer-ask-search-surface-convergence";
import {
  TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
  TAG_LIST_CUSTOMER_ASK_CHECKS,
} from "./customer-ask-tag-list-convergence";

export type Batch008CustomerAskInventoryEntry = {
  checkId: string;
  checklistRow: string;
};

/**
 * Unique batch-008 customer-ask inventory rows documented in
 * factory/docs/phase-1-customer-ask-convergence-validator.md.
 */
export const BATCH_008_CUSTOMER_ASK_INVENTORY: readonly Batch008CustomerAskInventoryEntry[] =
  [
    ...Object.values(HOME_HEADER_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
      checklistRow: HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW,
    })),
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    {
      checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    {
      checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    {
      checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    {
      checkId:
        SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    ...Object.values(GLOSSARY_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
      checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
    })),
    {
      checkId: DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId,
      checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
    },
    ...Object.values(GQA_MODULE_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
      checklistRow: GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
    })),
  ];

/**
 * Ordered batch-008 customer-ask check ids as emitted by the convergence report,
 * including per-query search surface expansions.
 */
export const BATCH_008_CUSTOMER_ASK_CHECK_IDS = [
  ...Object.values(HOME_HEADER_CUSTOMER_ASK_CHECKS).map(
    (check) => check.checkId,
  ),
  TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
  TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
  TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing.checkId,
  TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse.checkId,
  ...SEARCH_SURFACE_CUSTOMER_ASK_QUERIES.flatMap(() => [
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
  ]),
  ...SEARCH_SURFACE_CUSTOMER_ASK_QUERIES.map(
    () => SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
  ),
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
  ...Object.values(GLOSSARY_CUSTOMER_ASK_CHECKS).map((check) => check.checkId),
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId,
  ...Object.values(GQA_MODULE_CUSTOMER_ASK_CHECKS).map(
    (check) => check.checkId,
  ),
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts captured verifier output includes a full batch-008 PASS convergence report.
 */
export function assertBatch008CustomerAskReportAllPass(output: string): void {
  if (!output.includes(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER)) {
    throw new Error(
      `Expected customer-ask convergence report header in verifier output`,
    );
  }

  if (/\[FAIL\]/.test(output)) {
    throw new Error(
      "Expected no [FAIL] rows in customer-ask convergence report",
    );
  }

  for (const checkId of BATCH_008_CUSTOMER_ASK_CHECK_IDS) {
    const pattern = new RegExp(`\\[PASS\\] ${escapeRegExp(checkId)} —`);
    if (!pattern.test(output)) {
      throw new Error(
        `Expected [PASS] row for batch-008 checkId ${checkId} in verifier output`,
      );
    }
  }
}
