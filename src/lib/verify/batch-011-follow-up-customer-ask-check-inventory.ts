import {
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS,
  BATCH_011_FOLLOW_UP_HOME_ROUTE,
  BATCH_011_FOLLOW_UP_NAV_ROUTE,
} from "./batch-011-follow-up-home-nav-checks";
import {
  BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW,
  BATCH_011_FOLLOW_UP_SEARCH_CHECKS,
  BATCH_011_FOLLOW_UP_SEARCH_QUERIES,
  BATCH_011_FOLLOW_UP_SEARCH_ROUTES,
} from "./batch-011-follow-up-search-checks";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS,
  DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-docs-footer-convergence";
import {
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  GLOSSARY_CUSTOMER_ASK_CHECKS,
  GLOSSARY_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-glossary-convergence";
import {
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
  GQA_MODULE_CUSTOMER_ASK_CHECKS,
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-gqa-module-convergence";
import {
  HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW,
  HOME_HEADER_CUSTOMER_ASK_CHECKS,
  HOME_HEADER_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-home-header-convergence";
import {
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKS,
} from "./customer-ask-search-surface-convergence";
import {
  TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
  TAG_LIST_CUSTOMER_ASK_CHECKS,
  TAG_LIST_CUSTOMER_ASK_ROUTES,
} from "./customer-ask-tag-list-convergence";

export type Batch011FollowUpCustomerAskInventoryEntry = {
  checkId: string;
  checklistRow: string;
  route: string;
  query?: string;
};

/**
 * Unique batch-011 follow-up customer-ask inventory rows. Reuses unchanged
 * batch-008 check ids and adds follow-up-only ids for home brevity, nav theme,
 * and search row hover/selection contrast.
 */
export const BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY: readonly Batch011FollowUpCustomerAskInventoryEntry[] =
  [
    ...Object.values(HOME_HEADER_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
      checklistRow: HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW,
      route: HOME_HEADER_CUSTOMER_ASK_ROUTE,
    })),
    ...Object.values(BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS)
      .filter((check) => check.checkId.startsWith("home."))
      .map((check) => ({
        checkId: check.checkId,
        checklistRow: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
        route: BATCH_011_FOLLOW_UP_HOME_ROUTE,
      })),
    {
      checkId:
        BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.checkId,
      checklistRow: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_NAV_ROUTE,
    },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
      route: TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
    },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
      route: TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
    },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
      route: TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding,
    },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse.checkId,
      checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
      route: TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding,
    },
    {
      checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.searchPage,
    },
    {
      checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.searchPage,
    },
    {
      checkId: BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence.checkId,
      checklistRow: BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.searchPage,
    },
    {
      checkId:
        BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast
          .checkId,
      checklistRow: BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.searchPage,
    },
    {
      checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.headerDialog,
    },
    {
      checkId:
        BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogRowHoverCoherence.checkId,
      checklistRow: BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.headerDialog,
    },
    {
      checkId:
        BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogMatchedTextSelectionContrast
          .checkId,
      checklistRow: BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.headerDialog,
    },
    {
      checkId:
        SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
      checklistRow: SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW,
      route: BATCH_011_FOLLOW_UP_SEARCH_ROUTES.searchApi,
      query: "GQA",
    },
    ...Object.values(GLOSSARY_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
      checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
      route: GLOSSARY_CUSTOMER_ASK_ROUTE,
    })),
    {
      checkId: DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId,
      checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
      route: DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
    },
    ...Object.values(GQA_MODULE_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
      checklistRow: GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
      route: GQA_MODULE_CUSTOMER_ASK_ROUTE,
    })),
  ];

/**
 * Ordered batch-011 follow-up customer-ask check ids as emitted by the
 * convergence report, including per-query search surface expansions.
 */
export const BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS = [
  ...Object.values(HOME_HEADER_CUSTOMER_ASK_CHECKS).map(
    (check) => check.checkId,
  ),
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity.checkId,
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks.checkId,
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.checkId,
  TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
  TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
  TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing.checkId,
  TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse.checkId,
  ...BATCH_011_FOLLOW_UP_SEARCH_QUERIES.flatMap(() => [
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
    BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence.checkId,
    BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast.checkId,
  ]),
  ...BATCH_011_FOLLOW_UP_SEARCH_QUERIES.flatMap(() => [
    SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
    BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogRowHoverCoherence.checkId,
    BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogMatchedTextSelectionContrast
      .checkId,
  ]),
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
  ...Object.values(GLOSSARY_CUSTOMER_ASK_CHECKS).map((check) => check.checkId),
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId,
  ...Object.values(GQA_MODULE_CUSTOMER_ASK_CHECKS).map(
    (check) => check.checkId,
  ),
] as const;

export type Batch011FollowUpCustomerAskReportSlot = {
  checkId: string;
  query?: string;
};

/**
 * Ordered report slots for batch-011 follow-up customer-ask rows, including
 * per-query search surface expansions.
 */
export function buildBatch011FollowUpCustomerAskReportSlots(): readonly Batch011FollowUpCustomerAskReportSlot[] {
  return [
    ...Object.values(HOME_HEADER_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
    })),
    { checkId: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity.checkId },
    { checkId: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks.checkId },
    {
      checkId:
        BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.checkId,
    },
    { checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId },
    { checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId },
    {
      checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing.checkId,
    },
    { checkId: TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse.checkId },
    ...BATCH_011_FOLLOW_UP_SEARCH_QUERIES.flatMap((query) => [
      {
        checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
        query,
      },
      {
        checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
        query,
      },
      {
        checkId:
          BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence.checkId,
        query,
      },
      {
        checkId:
          BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast
            .checkId,
        query,
      },
    ]),
    ...BATCH_011_FOLLOW_UP_SEARCH_QUERIES.flatMap((query) => [
      {
        checkId: SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
        query,
      },
      {
        checkId:
          BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogRowHoverCoherence.checkId,
        query,
      },
      {
        checkId:
          BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogMatchedTextSelectionContrast
            .checkId,
        query,
      },
    ]),
    {
      checkId:
        SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
      query: "GQA",
    },
    ...Object.values(GLOSSARY_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
    })),
    { checkId: DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId },
    ...Object.values(GQA_MODULE_CUSTOMER_ASK_CHECKS).map((check) => ({
      checkId: check.checkId,
    })),
  ];
}

function rowMatchesReportSlot(
  row: CustomerAskConvergenceRow,
  slot: Batch011FollowUpCustomerAskReportSlot,
): boolean {
  if (row.checkId !== slot.checkId) {
    return false;
  }

  if (slot.query === undefined) {
    return row.query === undefined;
  }

  return row.query === slot.query;
}

function formatReportSlot(slot: Batch011FollowUpCustomerAskReportSlot): string {
  return slot.query === undefined
    ? slot.checkId
    : `${slot.checkId} (query=${slot.query})`;
}

/**
 * Orders customer-ask rows to match the batch-011 follow-up inventory and
 * throws when any required slot is missing or extra rows remain.
 */
export function orderCustomerAskRowsByBatch011Inventory(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const slots = buildBatch011FollowUpCustomerAskReportSlots();
  const pool = [...rows];
  const ordered: CustomerAskConvergenceRow[] = [];

  for (const slot of slots) {
    const index = pool.findIndex((row) => rowMatchesReportSlot(row, slot));
    if (index === -1) {
      throw new Error(
        `Missing customer-ask row for batch-011 inventory slot ${formatReportSlot(slot)}`,
      );
    }
    ordered.push(pool.splice(index, 1)[0]);
  }

  if (pool.length > 0) {
    throw new Error(
      `Unexpected extra customer-ask rows outside batch-011 inventory: ${pool.map((row) => formatReportSlot({ checkId: row.checkId, query: row.query })).join(", ")}`,
    );
  }

  return ordered;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts captured verifier output includes a full batch-011 follow-up PASS
 * convergence report.
 */
export function assertBatch011FollowUpCustomerAskReportAllPass(
  output: string,
): void {
  if (!output.includes(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER)) {
    throw new Error(
      "Expected customer-ask convergence report header in verifier output",
    );
  }

  if (/\[FAIL\]/.test(output)) {
    throw new Error(
      "Expected no [FAIL] rows in customer-ask convergence report",
    );
  }

  for (const checkId of BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS) {
    const pattern = new RegExp(`\\[PASS\\] ${escapeRegExp(checkId)} —`);
    if (!pattern.test(output)) {
      throw new Error(
        `Expected [PASS] row for batch-011 follow-up checkId ${checkId} in verifier output`,
      );
    }
  }
}
