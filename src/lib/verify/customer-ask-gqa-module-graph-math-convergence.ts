import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import {
  BATCH_012_GQA_MODULE_CHECKLIST_ROW,
  BATCH_012_GQA_MODULE_CHECKS,
  BATCH_012_GQA_MODULE_ROUTE,
} from "./batch-012-gqa-module-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  assertGroupedQueryAttentionGraphThemeConvergence,
  assertGroupedQueryAttentionMathDefinitionsConvergence,
  assertGroupedQueryAttentionSingleGraphConvergence,
  GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS,
} from "./grouped-query-attention-module-convergence";

export const GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS = {
  missingThemedNodeColors:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingThemedNodeColors,
  duplicateReactFlowGraph:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateReactFlowGraph,
  missingReactFlowGraph:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingReactFlowGraph,
  graphEmbeddedInMathSchema:
    "React Flow graph remains embedded in math or schema section",
  schemaGraphStillRendered:
    "compute-schema React Flow graph still renders on module page",
  missingMathDefinitions:
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingMathDefinitions,
} as const;

export const GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON =
  "React Flow node theme markers present but node color contrast is not provable from static HTML";

export const GQA_MODULE_GRAPH_THEME_MANUAL_VISUAL_CHECK_DOC =
  "factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md";

const REACT_FLOW_GRAPH_MARKER = 'data-react-flow-graph="true"';
const SCHEMA_GRAPH_ID_MARKER =
  'data-graph-id="graph.grouped-query-attention-compute-schema"';
const MATH_SCHEMA_SECTION_ID = 'id="math-or-compute-schema"';

function extractMathOrComputeSchemaSection(html: string): string | null {
  const sectionStart = html.indexOf(`<section ${MATH_SCHEMA_SECTION_ID}`);
  if (sectionStart < 0) {
    const altStart = html.indexOf(`<section${MATH_SCHEMA_SECTION_ID}`);
    if (altStart < 0) {
      return null;
    }
    const sectionClose = html.indexOf("</section>", altStart);
    if (sectionClose < 0) {
      return html.slice(altStart);
    }
    return html.slice(altStart, sectionClose);
  }

  const sectionClose = html.indexOf("</section>", sectionStart);
  if (sectionClose < 0) {
    return html.slice(sectionStart);
  }

  return html.slice(sectionStart, sectionClose);
}

function graphEmbeddedInMathOrSchemaSection(html: string): boolean {
  const mathSchemaRegion = extractMathOrComputeSchemaSection(html);
  if (!mathSchemaRegion) {
    return html.includes(SCHEMA_GRAPH_ID_MARKER);
  }

  return (
    mathSchemaRegion.includes(REACT_FLOW_GRAPH_MARKER) ||
    mathSchemaRegion.includes(SCHEMA_GRAPH_ID_MARKER)
  );
}

/**
 * Returns a failure reason when built GQA module HTML lacks readable React Flow
 * theme markers on the graph wrapper.
 */
export function assertGqaModuleGraphThemeMarkers(html: string): string | null {
  return assertGroupedQueryAttentionGraphThemeConvergence(
    stripHtmlScripts(html),
  );
}

/**
 * Returns a failure reason when built GQA module HTML renders zero, multiple,
 * or math/schema-embedded React Flow graph canvases.
 */
export function assertGqaModuleNoDuplicateMathGraph(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  const singleGraph =
    assertGroupedQueryAttentionSingleGraphConvergence(visibleHtml);
  if (
    singleGraph ===
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateReactFlowGraph
  ) {
    return GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.duplicateReactFlowGraph;
  }
  if (
    singleGraph ===
    GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingReactFlowGraph
  ) {
    return GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingReactFlowGraph;
  }

  if (graphEmbeddedInMathOrSchemaSection(visibleHtml)) {
    return visibleHtml.includes(SCHEMA_GRAPH_ID_MARKER)
      ? GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.schemaGraphStillRendered
      : GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.graphEmbeddedInMathSchema;
  }

  return null;
}

/**
 * Returns a failure reason when built GQA module math/schema HTML lacks
 * symbol-level Q, K, V, H, G, and index definitions under each equation.
 */
export function assertGqaModuleMathQkvDefinitions(html: string): string | null {
  return assertGroupedQueryAttentionMathDefinitionsConvergence(
    stripHtmlScripts(html),
  );
}

function buildGraphThemeReadabilityRow(
  html: string,
): CustomerAskConvergenceRow {
  const themeFailure = assertGqaModuleGraphThemeMarkers(html);
  if (themeFailure) {
    return {
      checkId: BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      title: BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.title,
      status: "fail",
      route: BATCH_012_GQA_MODULE_ROUTE,
      reason: themeFailure,
      checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
    };
  }

  return {
    checkId: BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
    title: BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.title,
    status: "uncertain",
    route: BATCH_012_GQA_MODULE_ROUTE,
    reason: `${GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON} — see ${GQA_MODULE_GRAPH_THEME_MANUAL_VISUAL_CHECK_DOC}`,
    checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
  };
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
 * Builds batch-012 GQA module graph and math customer-ask rows from built HTML.
 */
export function buildCustomerAskGqaModuleGraphMathRows(
  html: string,
): CustomerAskConvergenceRow[] {
  return [
    buildGraphThemeReadabilityRow(html),
    toPassFailRow(
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph,
      assertGqaModuleNoDuplicateMathGraph(html),
    ),
    toPassFailRow(
      BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions,
      assertGqaModuleMathQkvDefinitions(html),
    ),
  ];
}

export function buildCustomerAskGqaModuleGraphThemeReadabilityRow(
  html: string,
): CustomerAskConvergenceRow {
  return buildGraphThemeReadabilityRow(html);
}

export function buildCustomerAskGqaModuleNoDuplicateMathGraphRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph,
    assertGqaModuleNoDuplicateMathGraph(html),
  );
}

export function buildCustomerAskGqaModuleMathQkvDefinitionsRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions,
    assertGqaModuleMathQkvDefinitions(html),
  );
}
