import { existsSync } from "node:fs";
import { join } from "node:path";
import { PHASE_2_TAXONOMY_GLOSSARY_ROUTES } from "@/lib/build/verify-phase-1-static-routes";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertDocsShellConvergence } from "./docs-shell-convergence";
import {
  assertGroupedQueryAttentionChromeConvergence,
  assertGroupedQueryAttentionGraphAccessibilityConvergence,
  assertGroupedQueryAttentionGraphComparisonConvergence,
  assertGroupedQueryAttentionGraphInteractionConvergence,
  assertGroupedQueryAttentionGraphThemeConvergence,
  assertGroupedQueryAttentionMathDefinitionsConvergence,
  assertGroupedQueryAttentionSingleGraphConvergence,
} from "./grouped-query-attention-module-convergence";

export const RENDERED_QUALITY_BASELINE_REPORT_HEADER =
  "Rendered quality baseline audit";

export const QUALITY_DOCUMENTS_STANDARDS_PATH = join(
  process.cwd(),
  "docs/quality-documents-standards.md",
);

export const RENDERED_QUALITY_ACTIVE_STANDARDS = [
  "docs/writing-standards.md",
  "docs/documentation-template.md",
  "docs/graphing-standards.md",
] as const;

export type RenderedQualityViewportId = "desktop" | "mobile";

export type RenderedQualityViewport = {
  id: RenderedQualityViewportId;
  label: string;
  width: number;
  height: number;
};

export const RENDERED_QUALITY_VIEWPORTS: readonly RenderedQualityViewport[] = [
  { id: "desktop", label: "desktop", width: 1280, height: 800 },
  { id: "mobile", label: "mobile", width: 390, height: 844 },
] as const;

export type RenderedQualityBehaviorLane =
  | "route-renders"
  | "page-shell"
  | "content-standards"
  | "graph"
  | "overflow"
  | "accessibility";

export type RenderedQualityRouteKind =
  | "home"
  | "search"
  | "tags-index"
  | "tag-landing"
  | "architecture-index"
  | "glossary-index"
  | "module"
  | "glossary";

export type RenderedQualityAuditRoute = {
  path: string;
  label: string;
  kind: RenderedQualityRouteKind;
  /** When true, canonical pages should expose one folded summary marker. */
  requiresFoldedSummary?: boolean;
  /** When true, audit checks for customer-visible process or meta language. */
  checksProcessLanguage?: boolean;
};

/** Representative routes from the rendered quality PRD baseline. */
export const RENDERED_QUALITY_AUDIT_ROUTES: readonly RenderedQualityAuditRoute[] =
  [
    { path: "/", label: "home", kind: "home", checksProcessLanguage: true },
    { path: "/search", label: "search", kind: "search" },
    { path: "/tags", label: "tags index", kind: "tags-index" },
    {
      path: "/tags/attention",
      label: "attention tag landing",
      kind: "tag-landing",
    },
    {
      path: "/docs/architecture",
      label: "architecture index",
      kind: "architecture-index",
    },
    {
      path: "/docs/glossary",
      label: "glossary index",
      kind: "glossary-index",
    },
    {
      path: "/docs/modules/grouped-query-attention",
      label: "grouped-query-attention",
      kind: "module",
      requiresFoldedSummary: true,
    },
    {
      path: "/docs/modules/attention",
      label: "attention module",
      kind: "module",
      requiresFoldedSummary: true,
    },
    {
      path: "/docs/glossary/token",
      label: "token glossary",
      kind: "glossary",
      checksProcessLanguage: true,
    },
    {
      path: "/docs/glossary/vector",
      label: "vector glossary",
      kind: "glossary",
      checksProcessLanguage: true,
    },
    {
      path: "/docs/glossary/hidden-size",
      label: "hidden-size glossary",
      kind: "glossary",
      checksProcessLanguage: true,
    },
    {
      path: "/docs/glossary/model",
      label: "model glossary (Phase 2 taxonomy)",
      kind: "glossary",
    },
    {
      path: "/docs/glossary/architecture",
      label: "architecture glossary (Phase 2 taxonomy)",
      kind: "glossary",
    },
    {
      path: "/docs/glossary/representation",
      label: "representation glossary (Phase 2 taxonomy)",
      kind: "glossary",
    },
  ] as const;

export const RENDERED_QUALITY_PHASE_2_GLOSSARY_SAMPLE_ROUTES =
  PHASE_2_TAXONOMY_GLOSSARY_ROUTES.filter((route) =>
    [
      "/docs/glossary/model",
      "/docs/glossary/architecture",
      "/docs/glossary/representation",
    ].includes(route),
  );

export type RenderedQualityIssue = {
  route: string;
  routeLabel: string;
  viewport: RenderedQualityViewportId | "all";
  lane: RenderedQualityBehaviorLane;
  behavior: string;
  detail: string;
};

export type RenderedQualityStandardsBaseline = {
  qualityDocumentsStandardsPresent: boolean;
  qualityDocumentsStandardsGap: string | null;
  activeStandards: readonly string[];
};

export type RenderedQualityAuditResult = {
  auditedAtUtc: string;
  standards: RenderedQualityStandardsBaseline;
  issues: RenderedQualityIssue[];
  routesVisited: number;
  viewportChecks: number;
};

export const RENDERED_QUALITY_PROCESS_LANGUAGE_PATTERNS = [
  /Phase 1\b/i,
  /Phase 2\b/i,
  /manual gate/i,
  /convergence batch/i,
  /\bverifier\b/i,
  /Phase 1 bridge page/i,
  /Phase 1 sample/i,
] as const;

export const RENDERED_QUALITY_READER_SHORTCUT_MARKERS = [
  "callouts.readerShortcut",
  'data-testid="reader-shortcut"',
  "reader-shortcut",
] as const;

export const RENDERED_QUALITY_FOLDED_SUMMARY_MARKERS = [
  'data-testid="folded-summary"',
  'data-folded-summary="true"',
  'data-opening-summary="folded"',
] as const;

const H1_PATTERN = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;

function countH1Elements(html: string): number {
  return (html.match(H1_PATTERN) ?? []).length;
}

function visibleTextFromHtml(html: string): string {
  return stripHtmlScripts(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findProcessLanguageMatches(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of RENDERED_QUALITY_PROCESS_LANGUAGE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      matches.push(match[0]);
    }
  }
  return matches;
}

function hasFoldedSummaryMarker(html: string): boolean {
  for (const marker of RENDERED_QUALITY_FOLDED_SUMMARY_MARKERS) {
    if (html.includes(marker)) {
      return true;
    }
  }
  return /<details\b[^>]*\bdata-opening-summary\b/i.test(html);
}

function hasReaderShortcutMarker(html: string): string | null {
  for (const marker of RENDERED_QUALITY_READER_SHORTCUT_MARKERS) {
    if (html.includes(marker)) {
      return marker;
    }
  }
  return null;
}

function countReactFlowGraphs(html: string): number {
  return (html.match(/data-react-flow-graph="true"/g) ?? []).length;
}

export function buildRenderedQualityStandardsBaseline(
  projectRoot: string = process.cwd(),
): RenderedQualityStandardsBaseline {
  const qualityDocumentsStandardsPresent = existsSync(
    join(projectRoot, "docs/quality-documents-standards.md"),
  );

  return {
    qualityDocumentsStandardsPresent,
    qualityDocumentsStandardsGap: qualityDocumentsStandardsPresent
      ? null
      : "docs/quality-documents-standards.md is absent; writing-standards.md, documentation-template.md, and graphing-standards.md are the active rendered-quality baseline.",
    activeStandards: RENDERED_QUALITY_ACTIVE_STANDARDS,
  };
}

export type RenderedQualityHtmlAuditInput = {
  route: RenderedQualityAuditRoute;
  html: string;
  viewport?: RenderedQualityViewportId | "all";
};

/**
 * Returns observable rendered-quality issues for one route HTML snapshot.
 * Viewport-specific overflow checks are supplied separately by Playwright probes.
 */
export function auditRenderedQualityHtml(
  input: RenderedQualityHtmlAuditInput,
): RenderedQualityIssue[] {
  const { route, html } = input;
  const viewport = input.viewport ?? "all";
  const visibleHtml = stripHtmlScripts(html);
  const issues: RenderedQualityIssue[] = [];

  const shellFailure = assertDocsShellConvergence(visibleHtml);
  if (shellFailure && route.kind !== "home" && route.kind !== "search") {
    issues.push({
      route: route.path,
      routeLabel: route.label,
      viewport,
      lane: "page-shell",
      behavior: "docs shell contract",
      detail: shellFailure,
    });
  }

  const h1Count = countH1Elements(visibleHtml);
  if (h1Count > 1) {
    issues.push({
      route: route.path,
      routeLabel: route.label,
      viewport,
      lane: "page-shell",
      behavior: "duplicate title chrome",
      detail: `found ${h1Count} h1 elements`,
    });
  }

  if (route.requiresFoldedSummary && !hasFoldedSummaryMarker(visibleHtml)) {
    const hasOpeningSummaryBody =
      visibleHtml.includes('data-message-key="openingSummary"') ||
      /<T k="openingSummary"/i.test(visibleHtml) ||
      (route.kind === "module" &&
        visibleHtml.includes('aria-label="At a glance"'));
    issues.push({
      route: route.path,
      routeLabel: route.label,
      viewport,
      lane: "content-standards",
      behavior: "folded summary missing",
      detail: hasOpeningSummaryBody
        ? "openingSummary renders as visible prose without folded-summary marker"
        : "canonical page missing folded summary marker near top",
    });
  }

  if (route.checksProcessLanguage ?? route.kind === "module") {
    const matches = findProcessLanguageMatches(
      visibleTextFromHtml(visibleHtml),
    );
    if (matches.length > 0) {
      issues.push({
        route: route.path,
        routeLabel: route.label,
        viewport,
        lane: "content-standards",
        behavior: "customer-visible process language",
        detail: `matched: ${matches.join(", ")}`,
      });
    }
  }

  const readerShortcut = hasReaderShortcutMarker(visibleHtml);
  if (readerShortcut) {
    issues.push({
      route: route.path,
      routeLabel: route.label,
      viewport,
      lane: "content-standards",
      behavior: "reader-shortcut callout",
      detail: `marker present: ${readerShortcut}`,
    });
  }

  if (route.path === "/docs/modules/grouped-query-attention") {
    for (const [behavior, lane, assert] of [
      [
        "module chrome",
        "page-shell",
        assertGroupedQueryAttentionChromeConvergence,
      ],
      [
        "primary graph count",
        "graph",
        assertGroupedQueryAttentionSingleGraphConvergence,
      ],
      [
        "graph node theme",
        "graph",
        assertGroupedQueryAttentionGraphThemeConvergence,
      ],
      [
        "graph interaction markers",
        "graph",
        assertGroupedQueryAttentionGraphInteractionConvergence,
      ],
      [
        "graph accessibility",
        "graph",
        assertGroupedQueryAttentionGraphAccessibilityConvergence,
      ],
      [
        "attention variant comparison",
        "graph",
        assertGroupedQueryAttentionGraphComparisonConvergence,
      ],
      [
        "math symbol definitions",
        "content-standards",
        assertGroupedQueryAttentionMathDefinitionsConvergence,
      ],
    ] as const) {
      const reason = assert(visibleHtml);
      if (reason) {
        issues.push({
          route: route.path,
          routeLabel: route.label,
          viewport,
          lane,
          behavior,
          detail: reason,
        });
      }
    }

    const graphCount = countReactFlowGraphs(visibleHtml);
    if (visibleHtml.includes("graph.grouped-query-attention-compute-schema")) {
      issues.push({
        route: route.path,
        routeLabel: route.label,
        viewport,
        lane: "graph",
        behavior: "duplicate math-section graph",
        detail:
          "math or schema section still exposes compute-schema React Flow canvas",
      });
    }

    if (graphCount > 1) {
      issues.push({
        route: route.path,
        routeLabel: route.label,
        viewport,
        lane: "graph",
        behavior: "multiple React Flow canvases",
        detail: `found ${graphCount} data-react-flow-graph surfaces`,
      });
    }
  }

  return issues;
}

export type RenderedQualityOverflowProbe = {
  route: RenderedQualityAuditRoute;
  viewport: RenderedQualityViewportId;
  scrollWidth: number;
  innerWidth: number;
};

export function auditRenderedQualityOverflow(
  probe: RenderedQualityOverflowProbe,
): RenderedQualityIssue | null {
  if (probe.scrollWidth <= probe.innerWidth + 1) {
    return null;
  }

  return {
    route: probe.route.path,
    routeLabel: probe.route.label,
    viewport: probe.viewport,
    lane: "overflow",
    behavior: "horizontal page overflow",
    detail: `scrollWidth=${probe.scrollWidth} innerWidth=${probe.innerWidth}`,
  };
}

export function mergeRenderedQualityIssues(
  issueGroups: readonly RenderedQualityIssue[][],
): RenderedQualityIssue[] {
  const seen = new Set<string>();
  const merged: RenderedQualityIssue[] = [];

  for (const group of issueGroups) {
    for (const issue of group) {
      const key = [
        issue.route,
        issue.viewport,
        issue.lane,
        issue.behavior,
        issue.detail,
      ].join("|");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(issue);
    }
  }

  return merged;
}

export function buildRenderedQualityAuditResult(input: {
  issues: readonly RenderedQualityIssue[];
  routesVisited: number;
  viewportChecks: number;
  auditedAtUtc?: string;
  projectRoot?: string;
}): RenderedQualityAuditResult {
  return {
    auditedAtUtc: input.auditedAtUtc ?? new Date().toISOString(),
    standards: buildRenderedQualityStandardsBaseline(input.projectRoot),
    issues: [...input.issues],
    routesVisited: input.routesVisited,
    viewportChecks: input.viewportChecks,
  };
}
