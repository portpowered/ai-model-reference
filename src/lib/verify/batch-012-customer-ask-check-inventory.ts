import {
  BATCH_012_GLOSSARY_CHECKLIST_ROW,
  BATCH_012_GLOSSARY_CHECKS,
  BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_012_GLOSSARY_ROUTES,
} from "./batch-012-glossary-checks";
import {
  BATCH_012_GQA_MODULE_CHECKLIST_ROW,
  BATCH_012_GQA_MODULE_CHECKS,
  BATCH_012_GQA_MODULE_ROUTE,
} from "./batch-012-gqa-module-checks";
import {
  BATCH_012_ATTENTION_SEARCH_QUERY,
  BATCH_012_MISSING_PAGES_CHECKS,
  BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
  BATCH_012_MISSING_PAGES_MODULE_CHECKLIST_ROW,
  BATCH_012_MISSING_PAGES_ROUTES,
  BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW,
} from "./batch-012-missing-pages-checks";
import {
  BATCH_012_HEADER_BAR_CHECKLIST_ROW,
  BATCH_012_MOBILE_HEADER_CHECKS,
  BATCH_012_MOBILE_HEADER_ROUTE,
} from "./batch-012-mobile-header-checks";
import {
  BATCH_012_SEARCH_PAGE_CHECKLIST_ROW,
  BATCH_012_TAG_SEARCH_DECORATION_CHECKS,
  BATCH_012_TAG_SEARCH_DECORATION_ROUTES,
  BATCH_012_TAG_SEARCH_DECORATION_SEARCH_QUERIES,
  BATCH_012_TAGS_PAGE_CHECKLIST_ROW,
} from "./batch-012-tag-search-decoration-checks";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

export type Batch012CustomerAskInventoryEntry = {
  checkId: string;
  checklistRow: string;
  route: string;
  query?: string;
};

/**
 * Unique batch-012 customer-ask inventory rows mapped to
 * docs/internal/customer-ask.md sections.
 */
export const BATCH_012_CUSTOMER_ASK_INVENTORY: readonly Batch012CustomerAskInventoryEntry[] =
  [
    {
      checkId: BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu.checkId,
      checklistRow: BATCH_012_HEADER_BAR_CHECKLIST_ROW,
      route: BATCH_012_MOBILE_HEADER_ROUTE,
    },
    {
      checkId:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline
          .checkId,
      checklistRow: BATCH_012_TAGS_PAGE_CHECKLIST_ROW,
      route: BATCH_012_TAG_SEARCH_DECORATION_ROUTES.tagsIndex,
    },
    {
      checkId:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration
          .checkId,
      checklistRow: BATCH_012_SEARCH_PAGE_CHECKLIST_ROW,
      route: BATCH_012_TAG_SEARCH_DECORATION_ROUTES.searchPage,
    },
    ...BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES.map((route) => ({
      checkId: BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      checklistRow: BATCH_012_GLOSSARY_CHECKLIST_ROW,
      route,
    })),
    {
      checkId: BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      checklistRow: BATCH_012_GLOSSARY_CHECKLIST_ROW,
      route: BATCH_012_GLOSSARY_ROUTES.embedding,
    },
    {
      checkId: BATCH_012_MISSING_PAGES_CHECKS.attentionRoute.checkId,
      checklistRow: BATCH_012_MISSING_PAGES_MODULE_CHECKLIST_ROW,
      route: BATCH_012_MISSING_PAGES_ROUTES.attentionModule,
    },
    {
      checkId: BATCH_012_MISSING_PAGES_CHECKS.vectorRoute.checkId,
      checklistRow: BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
      route: BATCH_012_MISSING_PAGES_ROUTES.vectorGlossary,
    },
    {
      checkId: BATCH_012_MISSING_PAGES_CHECKS.hiddenSizeRoute.checkId,
      checklistRow: BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW,
      route: BATCH_012_MISSING_PAGES_ROUTES.hiddenSizeGlossary,
    },
    {
      checkId: BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
      checklistRow: BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW,
      route: BATCH_012_MISSING_PAGES_ROUTES.searchPage,
      query: BATCH_012_ATTENTION_SEARCH_QUERY,
    },
    {
      checkId: BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
      route: BATCH_012_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_012_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
      route: BATCH_012_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_012_GQA_MODULE_CHECKS.singleTagList.checkId,
      checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
      route: BATCH_012_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
      route: BATCH_012_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
      route: BATCH_012_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
      route: BATCH_012_GQA_MODULE_ROUTE,
    },
  ];

export type Batch012CustomerAskReportSlot = {
  checkId: string;
  route?: string;
  query?: string;
};

/**
 * Ordered report slots for batch-012 customer-ask rows, including per-route tag
 * coverage and per-query search surface expansions.
 */
export function buildBatch012CustomerAskReportSlots(): readonly Batch012CustomerAskReportSlot[] {
  return [
    { checkId: BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu.checkId },
    {
      checkId:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline
          .checkId,
      route: BATCH_012_TAG_SEARCH_DECORATION_ROUTES.tagsIndex,
    },
    {
      checkId:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline
          .checkId,
      route: BATCH_012_TAG_SEARCH_DECORATION_ROUTES.attentionLanding,
    },
    ...BATCH_012_TAG_SEARCH_DECORATION_SEARCH_QUERIES.map((query) => ({
      checkId:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration
          .checkId,
      route: BATCH_012_TAG_SEARCH_DECORATION_ROUTES.searchPage,
      query,
    })),
    ...BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES.map((route) => ({
      checkId: BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      route,
    })),
    { checkId: BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId },
    { checkId: BATCH_012_MISSING_PAGES_CHECKS.attentionRoute.checkId },
    { checkId: BATCH_012_MISSING_PAGES_CHECKS.vectorRoute.checkId },
    { checkId: BATCH_012_MISSING_PAGES_CHECKS.hiddenSizeRoute.checkId },
    {
      checkId: BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
      route: BATCH_012_MISSING_PAGES_ROUTES.searchPage,
      query: BATCH_012_ATTENTION_SEARCH_QUERY,
    },
    {
      checkId: BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
      route: BATCH_012_MISSING_PAGES_ROUTES.searchApi,
      query: BATCH_012_ATTENTION_SEARCH_QUERY,
    },
    { checkId: BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId },
    { checkId: BATCH_012_GQA_MODULE_CHECKS.noMetadataCard.checkId },
    { checkId: BATCH_012_GQA_MODULE_CHECKS.singleTagList.checkId },
    { checkId: BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId },
    { checkId: BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId },
    { checkId: BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId },
  ];
}

/**
 * Ordered batch-012 customer-ask check ids as emitted by the convergence
 * report, including per-route and per-query expansions.
 */
export const BATCH_012_CUSTOMER_ASK_CHECK_IDS =
  buildBatch012CustomerAskReportSlots().map(
    (slot) => slot.checkId,
  ) as readonly string[];

function rowMatchesReportSlot(
  row: CustomerAskConvergenceRow,
  slot: Batch012CustomerAskReportSlot,
): boolean {
  if (row.checkId !== slot.checkId) {
    return false;
  }

  if (slot.route !== undefined && row.route !== slot.route) {
    return false;
  }

  if (slot.query === undefined) {
    return row.query === undefined;
  }

  return row.query === slot.query;
}

function formatReportSlot(slot: Batch012CustomerAskReportSlot): string {
  const parts = [slot.checkId];
  if (slot.route !== undefined) {
    parts.push(`route=${slot.route}`);
  }
  if (slot.query !== undefined) {
    parts.push(`query=${slot.query}`);
  }
  return parts.join(" ");
}

/**
 * Orders customer-ask rows to match the batch-012 inventory and throws when any
 * required slot is missing or extra rows remain.
 */
export function orderCustomerAskRowsByBatch012Inventory(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const slots = buildBatch012CustomerAskReportSlots();
  const pool = [...rows];
  const ordered: CustomerAskConvergenceRow[] = [];

  for (const slot of slots) {
    const index = pool.findIndex((row) => rowMatchesReportSlot(row, slot));
    if (index === -1) {
      throw new Error(
        `Missing customer-ask row for batch-012 inventory slot ${formatReportSlot(slot)}`,
      );
    }
    ordered.push(pool.splice(index, 1)[0]);
  }

  if (pool.length > 0) {
    throw new Error(
      `Unexpected extra customer-ask rows outside batch-012 inventory: ${pool.map((row) => formatReportSlot({ checkId: row.checkId, route: row.route, query: row.query })).join(", ")}`,
    );
  }

  return ordered;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts captured verifier output includes a full batch-012 PASS convergence
 * report.
 */
export function assertBatch012CustomerAskReportAllPass(output: string): void {
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

  for (const checkId of BATCH_012_CUSTOMER_ASK_CHECK_IDS) {
    const pattern = new RegExp(`\\[PASS\\] ${escapeRegExp(checkId)} —`);
    if (!pattern.test(output)) {
      throw new Error(
        `Expected [PASS] row for batch-012 checkId ${checkId} in verifier output`,
      );
    }
  }
}
