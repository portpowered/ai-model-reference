import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import {
  BATCH_012_GQA_MODULE_CHECKLIST_ROW,
  BATCH_012_GQA_MODULE_CHECKS,
  BATCH_012_GQA_MODULE_ROUTE,
} from "./batch-012-gqa-module-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  assertGroupedQueryAttentionTitleConvergence,
  GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS,
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
} from "./grouped-query-attention-module-convergence";

export {
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-gqa-module-convergence";

export const GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS = {
  duplicateBodyHeading:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateBodyTitle,
  moduleMetadataCard:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.moduleMetadataCard,
  duplicateTagPillList:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateTagPillList,
  missingTagPillList:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingTagPillList,
  missingAtAGlance: "At a glance section missing from GQA module page",
  duplicateBodyH2Title: `duplicate ${GROUPED_QUERY_ATTENTION_MODULE_TITLE} body heading repeats page title`,
} as const;

const TAG_PILL_LIST_MARKER = 'data-testid="tag-pill-list"';
const MODULE_METADATA_MARKER = 'aria-label="Module metadata"';
const AT_A_GLANCE_MARKER = "At a glance";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMarkerOccurrences(html: string, marker: string): number {
  return (html.match(new RegExp(escapeRegExp(marker), "g")) ?? []).length;
}

function bodyRepeatsPageTitleAsHeading(html: string): boolean {
  const visibleHtml = stripHtmlScripts(html);
  const registryMatch = visibleHtml.match(
    /<(?:article|div)\b[^>]*\bdata-registry-id="module\.grouped-query-attention"[^>]*>/i,
  );
  if (!registryMatch || registryMatch.index === undefined) {
    return false;
  }

  const bodyHtml = visibleHtml.slice(registryMatch.index);
  const titlePattern = new RegExp(
    `<h[12]\\b[^>]*>\\s*${escapeRegExp(GROUPED_QUERY_ATTENTION_MODULE_TITLE)}\\s*</h[12]>`,
    "i",
  );
  return titlePattern.test(bodyHtml);
}

/**
 * Returns a failure reason when built GQA module HTML repeats the page title
 * as a body h1/h2 heading inside the module registry region.
 */
export function assertGqaModuleNoDuplicateBodyHeading(
  html: string,
): string | null {
  const titleFailure = assertGroupedQueryAttentionTitleConvergence(html);
  if (titleFailure) {
    return GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateBodyHeading;
  }

  if (bodyRepeatsPageTitleAsHeading(html)) {
    return GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateBodyH2Title;
  }

  return null;
}

/**
 * Returns a failure reason when built GQA module HTML still renders the module
 * metadata card outside At A Glance.
 */
export function assertGqaModuleNoMetadataCard(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);
  if (visibleHtml.includes(MODULE_METADATA_MARKER)) {
    return GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.moduleMetadataCard;
  }
  return null;
}

/**
 * Returns a failure reason when built GQA module HTML exposes zero or multiple
 * module tag pill lists, or omits the At A Glance section.
 */
export function assertGqaModuleSingleTagList(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes(AT_A_GLANCE_MARKER)) {
    return GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.missingAtAGlance;
  }

  const tagPillCount = countMarkerOccurrences(
    visibleHtml,
    TAG_PILL_LIST_MARKER,
  );
  if (tagPillCount === 0) {
    return GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.missingTagPillList;
  }
  if (tagPillCount > 1) {
    return GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateTagPillList;
  }

  return null;
}

function toPassFailRow(
  check: (typeof BATCH_012_GQA_MODULE_CHECKS)[keyof typeof BATCH_012_GQA_MODULE_CHECKS],
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: BATCH_012_GQA_MODULE_ROUTE,
    reason: reason ?? undefined,
    checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
  };
}

/**
 * Builds batch-012 GQA module deduplication customer-ask rows from built HTML.
 */
export function buildCustomerAskGqaModuleDeduplicationRows(
  html: string,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading,
      assertGqaModuleNoDuplicateBodyHeading(html),
    ),
    toPassFailRow(
      BATCH_012_GQA_MODULE_CHECKS.noMetadataCard,
      assertGqaModuleNoMetadataCard(html),
    ),
    toPassFailRow(
      BATCH_012_GQA_MODULE_CHECKS.singleTagList,
      assertGqaModuleSingleTagList(html),
    ),
  ];
}

export function buildCustomerAskGqaModuleNoDuplicateBodyHeadingRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading,
    assertGqaModuleNoDuplicateBodyHeading(html),
  );
}

export function buildCustomerAskGqaModuleNoMetadataCardRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_GQA_MODULE_CHECKS.noMetadataCard,
    assertGqaModuleNoMetadataCard(html),
  );
}

export function buildCustomerAskGqaModuleSingleTagListRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_GQA_MODULE_CHECKS.singleTagList,
    assertGqaModuleSingleTagList(html),
  );
}
