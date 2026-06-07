import {
  BATCH_013_GQA_MODULE_CHECKS,
  BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
  BATCH_013_GQA_MODULE_ROUTE,
} from "./batch-013-gqa-module-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  assertGqaModuleNoDuplicateBodyHeading,
  assertGqaModuleNoMetadataCard,
  assertGqaModuleSingleTagList,
} from "./customer-ask-gqa-module-deduplication-convergence";

function toPassFailRow(
  check: (typeof BATCH_013_GQA_MODULE_CHECKS)[keyof typeof BATCH_013_GQA_MODULE_CHECKS],
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: BATCH_013_GQA_MODULE_ROUTE,
    reason: reason ?? undefined,
    checklistRow: BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
  };
}

/**
 * Builds the batch-013 GQA duplicate body heading customer-ask row from built HTML.
 */
export function buildBatch013GqaModuleNoDuplicateBodyHeadingRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading,
    assertGqaModuleNoDuplicateBodyHeading(html),
  );
}

/**
 * Builds the batch-013 GQA metadata-card removal customer-ask row from built HTML.
 */
export function buildBatch013GqaModuleNoMetadataCardRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_013_GQA_MODULE_CHECKS.noMetadataCard,
    assertGqaModuleNoMetadataCard(html),
  );
}

/**
 * Builds the batch-013 GQA single tag-list customer-ask row from built HTML.
 */
export function buildBatch013GqaModuleSingleTagListRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_013_GQA_MODULE_CHECKS.singleTagList,
    assertGqaModuleSingleTagList(html),
  );
}

/**
 * Builds batch-013 GQA module deduplication customer-ask rows in inventory order
 * from built `/docs/modules/grouped-query-attention` HTML.
 */
export function buildBatch013GqaModuleDeduplicationRows(
  html: string,
): CustomerAskConvergenceRow[] {
  return [
    buildBatch013GqaModuleNoDuplicateBodyHeadingRow(html),
    buildBatch013GqaModuleNoMetadataCardRow(html),
    buildBatch013GqaModuleSingleTagListRow(html),
  ];
}
