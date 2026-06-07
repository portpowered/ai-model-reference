import {
  BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
  BATCH_013_GQA_MATH_CHECKLIST_ROW,
  BATCH_013_GQA_MODULE_CHECKS,
  BATCH_013_GQA_MODULE_ROUTE,
} from "./batch-013-gqa-module-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  assertGqaModuleGraphThemeMarkers,
  assertGqaModuleMathQkvDefinitions,
  assertGqaModuleNoDuplicateMathGraph,
  GQA_MODULE_GRAPH_THEME_MANUAL_VISUAL_CHECK_DOC,
  GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
} from "./customer-ask-gqa-module-graph-math-convergence";

function buildGraphThemeReadabilityRow(
  html: string,
): CustomerAskConvergenceRow {
  const themeFailure = assertGqaModuleGraphThemeMarkers(html);
  if (themeFailure) {
    return {
      checkId: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      title: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.title,
      status: "fail",
      route: BATCH_013_GQA_MODULE_ROUTE,
      reason: themeFailure,
      checklistRow: BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
    };
  }

  return {
    checkId: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
    title: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.title,
    status: "uncertain",
    route: BATCH_013_GQA_MODULE_ROUTE,
    reason: `${GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON} — see ${GQA_MODULE_GRAPH_THEME_MANUAL_VISUAL_CHECK_DOC}`,
    checklistRow: BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
  };
}

function toPassFailRow(
  check: (typeof BATCH_013_GQA_MODULE_CHECKS)[keyof typeof BATCH_013_GQA_MODULE_CHECKS],
  reason: string | null,
  checklistRow: string,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: BATCH_013_GQA_MODULE_ROUTE,
    reason: reason ?? undefined,
    checklistRow,
  };
}

/**
 * Builds the batch-013 GQA graph theme readability customer-ask row from built HTML.
 */
export function buildBatch013GqaModuleGraphThemeReadabilityRow(
  html: string,
): CustomerAskConvergenceRow {
  return buildGraphThemeReadabilityRow(html);
}

/**
 * Builds the batch-013 GQA single-graph-outside-math customer-ask row from built HTML.
 */
export function buildBatch013GqaModuleNoDuplicateMathGraphRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph,
    assertGqaModuleNoDuplicateMathGraph(html),
    BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
  );
}

/**
 * Builds the batch-013 GQA math Q/K/V definitions customer-ask row from built HTML.
 */
export function buildBatch013GqaModuleMathQkvDefinitionsRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions,
    assertGqaModuleMathQkvDefinitions(html),
    BATCH_013_GQA_MATH_CHECKLIST_ROW,
  );
}

/**
 * Builds batch-013 GQA module graph and math customer-ask rows in inventory order
 * from built `/docs/modules/grouped-query-attention` HTML.
 */
export function buildBatch013GqaModuleGraphMathRows(
  html: string,
): CustomerAskConvergenceRow[] {
  return [
    buildGraphThemeReadabilityRow(html),
    buildBatch013GqaModuleNoDuplicateMathGraphRow(html),
    buildBatch013GqaModuleMathQkvDefinitionsRow(html),
  ];
}
