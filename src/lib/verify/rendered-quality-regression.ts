import type { RenderedQualityBehaviorLane } from "./rendered-quality-baseline";

export const RENDERED_QUALITY_REGRESSION_DOMAIN_ID =
  "rendered-quality-regression" as const;

export const RENDERED_QUALITY_REGRESSION_DOMAIN_LABEL =
  "Rendered documentation quality regression coverage";

export const RENDERED_QUALITY_REGRESSION_CHECKLIST_ROW =
  "rendered-quality-regression";

export type RenderedQualityRegressionCheck = {
  checkId: string;
  title: string;
  lane: RenderedQualityBehaviorLane;
  behavior: string;
  testFiles: readonly string[];
};

export type RenderedQualityRegressionCatalogEntry = {
  checkId: string;
  title: string;
  lane: RenderedQualityBehaviorLane;
  behavior: string;
  testFiles: readonly string[];
  checklistRow: string;
};

export type RenderedQualityRegressionEvidence = {
  domainId: typeof RENDERED_QUALITY_REGRESSION_DOMAIN_ID;
  label: string;
  checklistRow: string;
  catalog: readonly RenderedQualityRegressionCatalogEntry[];
};

/**
 * Catalog of observable rendered-quality failures fixed in stories 002–006 and
 * the automated coverage that guards each behavior.
 */
export const RENDERED_QUALITY_REGRESSION_CHECKS = [
  {
    checkId: "rendered-regression.page-shell.single-title-chrome",
    title: "Representative docs pages expose one visible page title area",
    lane: "page-shell",
    behavior: "duplicate title chrome",
    testFiles: [
      "src/lib/verify/rendered-quality-baseline.test.ts",
      "src/lib/content/grouped-query-attention-module-shell-chrome.test.tsx",
    ],
  },
  {
    checkId: "rendered-regression.page-shell.folded-summary",
    title: "Canonical module pages render one folded opening summary",
    lane: "page-shell",
    behavior: "folded summary missing",
    testFiles: [
      "src/features/docs/components/FoldedSummary.test.tsx",
      "src/lib/content/page-shell-folded-summary.test.tsx",
      "src/lib/verify/rendered-quality-baseline.test.ts",
    ],
  },
  {
    checkId: "rendered-regression.content-standards.process-language",
    title: "Canonical routes omit customer-visible process or meta language",
    lane: "content-standards",
    behavior: "customer-visible process language",
    testFiles: [
      "src/lib/content/canonical-content-standards.test.tsx",
      "src/lib/verify/rendered-quality-baseline.test.ts",
      "src/tests/verify/rendered-quality-baseline-audit.test.ts",
    ],
  },
  {
    checkId: "rendered-regression.content-standards.reader-shortcuts",
    title: "Canonical pages omit baseline reader-shortcut callouts",
    lane: "content-standards",
    behavior: "reader shortcut callout",
    testFiles: ["src/lib/content/canonical-content-standards.test.tsx"],
  },
  {
    checkId: "rendered-regression.graph.single-primary-canvas",
    title: "Grouped-query-attention exposes one teaching-section graph",
    lane: "graph",
    behavior: "primary graph count",
    testFiles: [
      "src/lib/verify/rendered-quality-baseline.test.ts",
      "src/lib/verify/rendered-quality-baseline-graph-interaction.test.ts",
    ],
  },
  {
    checkId: "rendered-regression.graph.theme-and-interaction-markers",
    title: "GQA graph uses readable theme and disabled editing markers",
    lane: "graph",
    behavior: "graph node theme",
    testFiles: [
      "src/lib/verify/rendered-quality-baseline.test.ts",
      "src/lib/verify/rendered-quality-baseline-graph-interaction.test.ts",
    ],
  },
  {
    checkId: "rendered-regression.graph.pan-zoom-and-comparison",
    title: "GQA graph pan, zoom, and MHA comparison remain interactive",
    lane: "graph",
    behavior: "graph pan and zoom",
    testFiles: [
      "src/lib/verify/rendered-quality-baseline-graph-interaction.test.ts",
      "src/tests/verify/rendered-quality-baseline-audit.test.ts",
    ],
  },
  {
    checkId: "rendered-regression.overflow.rich-content-containment",
    title:
      "Tables, code, and math stay inside the viewport via scroll surfaces",
    lane: "overflow",
    behavior: "rich content overflow",
    testFiles: [
      "src/lib/verify/rendered-quality-baseline-rich-content.test.ts",
      "src/lib/verify/rendered-quality-baseline.test.ts",
      "src/features/docs/components/DocsCodeBlock.test.tsx",
    ],
  },
  {
    checkId: "rendered-regression.overflow.page-horizontal-overflow",
    title: "Representative routes avoid horizontal page overflow",
    lane: "overflow",
    behavior: "horizontal page overflow",
    testFiles: [
      "src/lib/verify/rendered-quality-baseline.test.ts",
      "src/tests/verify/rendered-quality-baseline-audit.test.ts",
    ],
  },
  {
    checkId: "rendered-regression.accessibility.search-and-tags",
    title: "Search and tag surfaces expose accessible states and focus rings",
    lane: "accessibility",
    behavior: "search and tag accessibility",
    testFiles: [
      "src/lib/verify/rendered-quality-accessibility-convergence.test.ts",
      "src/lib/verify/rendered-quality-baseline-accessibility.test.ts",
    ],
  },
  {
    checkId: "rendered-regression.accessibility.keyboard-navigation",
    title: "Search, tags, TOC, and graph switchers are keyboard operable",
    lane: "accessibility",
    behavior: "keyboard navigation",
    testFiles: [
      "src/lib/verify/rendered-quality-baseline-accessibility.test.ts",
      "src/tests/verify/rendered-quality-baseline-audit.test.ts",
    ],
  },
] as const satisfies readonly RenderedQualityRegressionCheck[];

export const RENDERED_QUALITY_REGRESSION_TEST_FILES = [
  ...new Set(
    RENDERED_QUALITY_REGRESSION_CHECKS.flatMap((check) => check.testFiles),
  ),
] as const;

export const RENDERED_QUALITY_REGRESSION_UNIT_TEST_COMMAND = `bun test ${RENDERED_QUALITY_REGRESSION_TEST_FILES.join(" ")}`;

export const RENDERED_QUALITY_REGRESSION_BASELINE_COMMAND =
  "make build && make verify-rendered-quality-baseline";

export const RENDERED_QUALITY_REGRESSION_PASS_COMMAND =
  "make verify-rendered-quality-regression";

export function buildRenderedQualityRegressionCatalog(): RenderedQualityRegressionCatalogEntry[] {
  return RENDERED_QUALITY_REGRESSION_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    lane: check.lane,
    behavior: check.behavior,
    testFiles: check.testFiles,
    checklistRow: RENDERED_QUALITY_REGRESSION_CHECKLIST_ROW,
  }));
}

/** @deprecated Use buildRenderedQualityRegressionCatalog — catalog rows are documentation only. */
export function buildRenderedQualityRegressionCatalogRows(): RenderedQualityRegressionCatalogEntry[] {
  return buildRenderedQualityRegressionCatalog();
}

export function buildRenderedQualityRegressionEvidence(): RenderedQualityRegressionEvidence {
  return {
    domainId: RENDERED_QUALITY_REGRESSION_DOMAIN_ID,
    label: RENDERED_QUALITY_REGRESSION_DOMAIN_LABEL,
    checklistRow: RENDERED_QUALITY_REGRESSION_CHECKLIST_ROW,
    catalog: buildRenderedQualityRegressionCatalog(),
  };
}

/** @deprecated Use buildRenderedQualityRegressionEvidence — catalog completeness is not acceptance evidence. */
export function deriveRenderedQualityRegressionEvidence(
  catalog: readonly RenderedQualityRegressionCatalogEntry[] = buildRenderedQualityRegressionCatalog(),
): RenderedQualityRegressionEvidence {
  return {
    domainId: RENDERED_QUALITY_REGRESSION_DOMAIN_ID,
    label: RENDERED_QUALITY_REGRESSION_DOMAIN_LABEL,
    checklistRow: RENDERED_QUALITY_REGRESSION_CHECKLIST_ROW,
    catalog,
  };
}

export function formatRenderedQualityRegressionCatalogEntryLine(
  entry: RenderedQualityRegressionCatalogEntry,
): string {
  const files = entry.testFiles.join(", ");
  return `[CATALOG] ${entry.checkId} (${entry.lane}/${entry.behavior}) — ${entry.title} — tests: ${files}`;
}

/** @deprecated Use formatRenderedQualityRegressionCatalogEntryLine */
export function formatRenderedQualityRegressionCheckRowLine(
  entry: RenderedQualityRegressionCatalogEntry,
): string {
  return formatRenderedQualityRegressionCatalogEntryLine(entry);
}

export function formatRenderedQualityRegressionReport(
  evidence: RenderedQualityRegressionEvidence,
): string {
  const lines = [
    `# ${RENDERED_QUALITY_REGRESSION_DOMAIN_LABEL}`,
    "",
    "Maintainer catalog only — acceptance is driven by the unit regression suite and built-app baseline audit below.",
    "",
    "## Regression catalog",
    "",
    ...evidence.catalog.map((entry) =>
      formatRenderedQualityRegressionCatalogEntryLine(entry),
    ),
    "",
    "## Repeatable commands",
    "",
    `- Unit regression suite: \`${RENDERED_QUALITY_REGRESSION_UNIT_TEST_COMMAND}\``,
    `- Built-app baseline audit: \`${RENDERED_QUALITY_REGRESSION_BASELINE_COMMAND}\``,
    `- Full convergence pass: \`${RENDERED_QUALITY_REGRESSION_PASS_COMMAND}\``,
    "",
  ];

  return lines.join("\n");
}

export function getRenderedQualityRegressionExitCode(
  unitTestExitCode = 0,
  baselineAuditExitCode = 0,
): number {
  if (unitTestExitCode !== 0) {
    return unitTestExitCode;
  }
  if (baselineAuditExitCode !== 0) {
    return baselineAuditExitCode;
  }
  return 0;
}
