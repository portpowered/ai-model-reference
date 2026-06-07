import {
  BATCH_013_GLOSSARY_CHECKLIST_ROW,
  BATCH_013_GLOSSARY_CHECKS,
  BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_013_GLOSSARY_ROUTES,
} from "./batch-013-glossary-checks";
import {
  BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
  BATCH_013_GQA_MATH_CHECKLIST_ROW,
  BATCH_013_GQA_MODULE_CHECKS,
  BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
  BATCH_013_GQA_MODULE_ROUTE,
} from "./batch-013-gqa-module-checks";
import {
  BATCH_013_ROUTE_CHECKS,
  BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
  BATCH_013_ROUTE_PATHS,
} from "./batch-013-route-checks";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

export type Batch013CustomerAskInventoryEntry = {
  checkId: string;
  checklistRow: string;
  route: string;
  query?: string;
  title: string;
};

/**
 * Unique batch-013 customer-ask inventory rows mapped to reopened glossary and
 * grouped-query-attention Phase 1 outcomes in docs/internal/customer-ask.md.
 */
export const BATCH_013_CUSTOMER_ASK_INVENTORY: readonly Batch013CustomerAskInventoryEntry[] =
  [
    ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES.map((route) => ({
      checkId: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      checklistRow: BATCH_013_GLOSSARY_CHECKLIST_ROW,
      route,
      title: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.title,
    })),
    {
      checkId: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      checklistRow: BATCH_013_GLOSSARY_CHECKLIST_ROW,
      route: BATCH_013_GLOSSARY_ROUTES.embedding,
      title: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.title,
    },
    {
      checkId: BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
      checklistRow: BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
      route: BATCH_013_ROUTE_PATHS.vectorGlossary,
      title: BATCH_013_ROUTE_CHECKS.vectorRoute.title,
    },
    {
      checkId: BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
      checklistRow: BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
      route: BATCH_013_ROUTE_PATHS.hiddenSizeGlossary,
      title: BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.title,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      checklistRow: BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
      route: BATCH_013_GQA_MODULE_ROUTE,
      title: BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading.title,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      checklistRow: BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
      route: BATCH_013_GQA_MODULE_ROUTE,
      title: BATCH_013_GQA_MODULE_CHECKS.noMetadataCard.title,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.singleTagList.checkId,
      checklistRow: BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
      route: BATCH_013_GQA_MODULE_ROUTE,
      title: BATCH_013_GQA_MODULE_CHECKS.singleTagList.title,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      checklistRow: BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
      route: BATCH_013_GQA_MODULE_ROUTE,
      title: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.title,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      checklistRow: BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
      route: BATCH_013_GQA_MODULE_ROUTE,
      title: BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.title,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      checklistRow: BATCH_013_GQA_MATH_CHECKLIST_ROW,
      route: BATCH_013_GQA_MODULE_ROUTE,
      title: BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.title,
    },
  ];

export type Batch013CustomerAskReportSlot = {
  checkId: string;
  route?: string;
  query?: string;
};

/**
 * Ordered report slots for batch-013 customer-ask rows, including per-route
 * opening-summary coverage for the reopened glossary repair set.
 */
export function buildBatch013CustomerAskReportSlots(): readonly Batch013CustomerAskReportSlot[] {
  return [
    ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES.map((route) => ({
      checkId: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      route,
    })),
    {
      checkId: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      route: BATCH_013_GLOSSARY_ROUTES.embedding,
    },
    {
      checkId: BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
      route: BATCH_013_ROUTE_PATHS.vectorGlossary,
    },
    {
      checkId: BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
      route: BATCH_013_ROUTE_PATHS.hiddenSizeGlossary,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      route: BATCH_013_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      route: BATCH_013_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.singleTagList.checkId,
      route: BATCH_013_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      route: BATCH_013_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      route: BATCH_013_GQA_MODULE_ROUTE,
    },
    {
      checkId: BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      route: BATCH_013_GQA_MODULE_ROUTE,
    },
  ];
}

/**
 * Ordered batch-013 customer-ask check ids as emitted by the convergence
 * report, including per-route opening-summary expansions.
 */
export const BATCH_013_CUSTOMER_ASK_CHECK_IDS =
  buildBatch013CustomerAskReportSlots().map(
    (slot) => slot.checkId,
  ) as readonly string[];

function rowMatchesReportSlot(
  row: CustomerAskConvergenceRow,
  slot: Batch013CustomerAskReportSlot,
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

function formatReportSlot(slot: Batch013CustomerAskReportSlot): string {
  const parts = [slot.checkId];
  if (slot.route !== undefined) {
    parts.push(`route=${slot.route}`);
  }
  if (slot.query !== undefined) {
    parts.push(`query=${slot.query}`);
  }
  return parts.join(" ");
}

function findInventoryEntryForSlot(
  slot: Batch013CustomerAskReportSlot,
): Batch013CustomerAskInventoryEntry {
  const entry = BATCH_013_CUSTOMER_ASK_INVENTORY.find(
    (candidate) =>
      candidate.checkId === slot.checkId &&
      (slot.route === undefined || candidate.route === slot.route) &&
      (slot.query === undefined
        ? candidate.query === undefined
        : candidate.query === slot.query),
  );
  if (!entry) {
    throw new Error(
      `Missing batch-013 inventory metadata for slot ${formatReportSlot(slot)}`,
    );
  }
  return entry;
}

/**
 * Extracts batch-013 reopened-row evidence from a full customer-ask convergence
 * report. Missing inventory slots become fail rows so planners still see gaps.
 */
export function extractBatch013CustomerAskRowsFromReport(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const slots = buildBatch013CustomerAskReportSlots();
  const pool = [...rows];
  const extracted: CustomerAskConvergenceRow[] = [];

  for (const slot of slots) {
    const index = pool.findIndex((row) => rowMatchesReportSlot(row, slot));
    if (index !== -1) {
      extracted.push(pool.splice(index, 1)[0]);
      continue;
    }

    const entry = findInventoryEntryForSlot(slot);
    extracted.push({
      checkId: entry.checkId,
      title: entry.title,
      status: "fail",
      route: entry.route,
      query: entry.query,
      reason: "missing from customer-ask convergence report",
      checklistRow: entry.checklistRow,
    });
  }

  return extracted;
}

/**
 * Orders customer-ask rows to match the batch-013 inventory and throws when any
 * required slot is missing or extra rows remain.
 */
export function orderCustomerAskRowsByBatch013Inventory(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const slots = buildBatch013CustomerAskReportSlots();
  const pool = [...rows];
  const ordered: CustomerAskConvergenceRow[] = [];

  for (const slot of slots) {
    const index = pool.findIndex((row) => rowMatchesReportSlot(row, slot));
    if (index === -1) {
      throw new Error(
        `Missing customer-ask row for batch-013 inventory slot ${formatReportSlot(slot)}`,
      );
    }
    ordered.push(pool.splice(index, 1)[0]);
  }

  if (pool.length > 0) {
    throw new Error(
      `Unexpected extra customer-ask rows outside batch-013 inventory: ${pool.map((row) => formatReportSlot({ checkId: row.checkId, route: row.route, query: row.query })).join(", ")}`,
    );
  }

  return ordered;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts captured verifier output includes a full batch-013 PASS convergence
 * report for the reopened-row inventory.
 */
export function assertBatch013CustomerAskReportAllPass(output: string): void {
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

  for (const checkId of BATCH_013_CUSTOMER_ASK_CHECK_IDS) {
    const pattern = new RegExp(`\\[PASS\\] ${escapeRegExp(checkId)} —`);
    if (!pattern.test(output)) {
      throw new Error(
        `Expected [PASS] row for batch-013 checkId ${checkId} in verifier output`,
      );
    }
  }
}
