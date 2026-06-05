import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import { assertNonProseGroupedListDisc } from "./customer-ask-tag-list-convergence";
import { assertGroupedQueryAttentionGraphBuildMarkersConvergence } from "./grouped-query-attention-module-convergence";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

/** Checklist row for batch-008 GQA module page customer-ask inventory. */
export const GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW =
  "phase-1-module-page" as const;

export const GQA_MODULE_CUSTOMER_ASK_ROUTE =
  PHASE_1_GROUPED_QUERY_ATTENTION_URL;

export const GQA_MODULE_REGISTRY_ID = "module.grouped-query-attention" as const;

export const GQA_MODULE_CUSTOMER_ASK_CHECKS = {
  presentation: {
    checkId: "module.presentation",
    title:
      "GQA module page uses React Flow renderer and converged section content",
  },
  graphBuildMarkers: {
    checkId: "module.graph-build-markers",
    title: "GQA module page exposes required graph accessibility/build markers",
  },
  listDisc: {
    checkId: "module.list-disc",
    title: "GQA module architecture and tag lists omit list-disc outside prose",
  },
  mhaGqaComparison: {
    checkId: "module.mha-gqa-comparison",
    title: "GQA module page renders MHA vs GQA comparison via katex or latex",
  },
} as const;

export const GQA_MODULE_CUSTOMER_ASK_REASONS = {
  variantsSection: "Variants And Nearby Modules section still present",
  danglingComparisonTable:
    "dangling comparison-table reference without rendered table content",
  missingReactFlowRenderer: "React Flow module renderer markers missing",
  nonProseListDisc:
    "non-prose architecture or tag list renders list-disc outside prose regions",
  missingLatexComparison:
    "MHA vs GQA algorithm comparison missing katex or latex renderer markers",
  implicitProseComparison:
    "MHA vs GQA comparison relies on implicit prose without katex or latex renderer markers",
} as const;

const REACT_FLOW_MARKERS = [
  'data-react-flow-graph="true"',
  'data-web-renderer="react-flow"',
] as const;

const DANGLING_COMPARISON_TABLE_MARKER =
  ">table.grouped-query-attention-comparison<";

const MHA_GQA_FORMULA_MARKERS = [
  'data-message-block-math="math.mhaSchema.formula"',
  'data-message-block-math="math.gqaSchema.formula"',
] as const;

const KATEX_MARKERS = ['class="katex"', "katex-display"] as const;

const IMPLICIT_COMPARISON_PROSE_MARKERS = [
  "Compared To Nearby Modules",
  'href="/docs/modules/multi-head-attention"',
  "Multi-Head Attention",
] as const;

/**
 * Returns a failure reason when built GQA module HTML still shows pre-repair
 * section headings, dangling comparison-table references, or lacks React Flow
 * renderer markers.
 */
export function assertGqaModulePresentationConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (visibleHtml.includes("Variants And Nearby Modules")) {
    return GQA_MODULE_CUSTOMER_ASK_REASONS.variantsSection;
  }

  if (visibleHtml.includes(DANGLING_COMPARISON_TABLE_MARKER)) {
    return GQA_MODULE_CUSTOMER_ASK_REASONS.danglingComparisonTable;
  }

  const hasReactFlowMarker = REACT_FLOW_MARKERS.some((marker) =>
    visibleHtml.includes(marker),
  );
  if (!hasReactFlowMarker) {
    return GQA_MODULE_CUSTOMER_ASK_REASONS.missingReactFlowRenderer;
  }

  return null;
}

/**
 * Returns a failure reason when built GQA module HTML lacks required graph node
 * accessibility/build markers from the shared module convergence assertion.
 */
export function assertGqaModuleGraphBuildMarkersConvergence(
  html: string,
): string | null {
  return assertGroupedQueryAttentionGraphBuildMarkersConvergence(
    stripHtmlScripts(html),
  );
}

/**
 * Returns a failure reason when non-prose architecture or tag lists on the GQA
 * module page still render disc bullets outside prose regions.
 */
export function assertGqaModuleListDiscConvergence(
  html: string,
): string | null {
  if (assertNonProseGroupedListDisc(html)) {
    return GQA_MODULE_CUSTOMER_ASK_REASONS.nonProseListDisc;
  }
  return null;
}

function hasKatexOrLatexSurface(html: string): boolean {
  return KATEX_MARKERS.some((marker) => html.includes(marker));
}

function hasMhaGqaFormulaMarkers(html: string): boolean {
  return MHA_GQA_FORMULA_MARKERS.every((marker) => html.includes(marker));
}

function hasImplicitComparisonProse(html: string): boolean {
  return IMPLICIT_COMPARISON_PROSE_MARKERS.some((marker) =>
    html.includes(marker),
  );
}

/**
 * Returns a failure reason when the built GQA module page lacks a detectable
 * MHA vs GQA latex/katex comparison or only exposes implicit prose mentions.
 */
export function assertGqaModuleMhaGqaComparisonConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);
  const hasLatexComparison =
    hasMhaGqaFormulaMarkers(visibleHtml) && hasKatexOrLatexSurface(visibleHtml);

  if (hasLatexComparison) {
    return null;
  }

  if (hasImplicitComparisonProse(visibleHtml)) {
    return GQA_MODULE_CUSTOMER_ASK_REASONS.implicitProseComparison;
  }

  return GQA_MODULE_CUSTOMER_ASK_REASONS.missingLatexComparison;
}

function toPassFailRow(
  check: (typeof GQA_MODULE_CUSTOMER_ASK_CHECKS)[keyof typeof GQA_MODULE_CUSTOMER_ASK_CHECKS],
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: GQA_MODULE_CUSTOMER_ASK_ROUTE,
    reason: reason ?? undefined,
    checklistRow: GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

/**
 * Builds customer-ask convergence rows for the canonical GQA module page from
 * built HTML.
 */
export function buildCustomerAskGqaModuleRows(
  html: string,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      GQA_MODULE_CUSTOMER_ASK_CHECKS.presentation,
      assertGqaModulePresentationConvergence(html),
    ),
    toPassFailRow(
      GQA_MODULE_CUSTOMER_ASK_CHECKS.graphBuildMarkers,
      assertGqaModuleGraphBuildMarkersConvergence(html),
    ),
    toPassFailRow(
      GQA_MODULE_CUSTOMER_ASK_CHECKS.listDisc,
      assertGqaModuleListDiscConvergence(html),
    ),
    toPassFailRow(
      GQA_MODULE_CUSTOMER_ASK_CHECKS.mhaGqaComparison,
      assertGqaModuleMhaGqaComparisonConvergence(html),
    ),
  ];
}
