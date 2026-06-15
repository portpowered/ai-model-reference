import type {
  RenderedQualityAuditRoute,
  RenderedQualityIssue,
  RenderedQualityViewportId,
} from "./rendered-quality-baseline";
import {
  BACKPROPAGATION_RICH_CONTENT_ROUTE,
  GQA_RICH_CONTENT_ROUTE,
} from "./rendered-quality-rich-content-convergence";

export type RichContentScrollProbe = {
  contained: boolean;
  scrollable: boolean;
  needsScroll: boolean;
};

export type RenderedQualityRichContentProbe = {
  route: RenderedQualityAuditRoute;
  viewport: RenderedQualityViewportId;
  innerWidth: number;
  table: RichContentScrollProbe | null;
  code: RichContentScrollProbe | null;
  math: RichContentScrollProbe | null;
  errorDetail?: string;
};

export const RICH_CONTENT_AUDIT_ROUTES: readonly RenderedQualityAuditRoute[] = [
  {
    path: GQA_RICH_CONTENT_ROUTE,
    label: "grouped-query-attention rich content",
    kind: "module",
  },
  {
    path: BACKPROPAGATION_RICH_CONTENT_ROUTE,
    label: "backpropagation rich content",
    kind: "glossary",
  },
] as const;

function auditScrollSurface(
  probe: RichContentScrollProbe | null,
  label: string,
  route: RenderedQualityAuditRoute,
  viewport: RenderedQualityViewportId,
): RenderedQualityIssue[] {
  if (!probe) {
    return [];
  }

  const issues: RenderedQualityIssue[] = [];

  if (!probe.contained) {
    issues.push({
      route: route.path,
      routeLabel: route.label,
      viewport,
      lane: "overflow",
      behavior: `${label} viewport overflow`,
      detail: `${label} scroll surface extends past the viewport without containment`,
    });
  }

  if (probe.needsScroll && !probe.scrollable) {
    issues.push({
      route: route.path,
      routeLabel: route.label,
      viewport,
      lane: "overflow",
      behavior: `${label} horizontal scroll`,
      detail: `${label} content is wider than its scroll container but overflow-x is not scrollable`,
    });
  }

  return issues;
}

/**
 * Returns rich-content overflow issues for table, code, and math scroll surfaces.
 */
export function auditRenderedQualityRichContent(
  probe: RenderedQualityRichContentProbe,
): RenderedQualityIssue[] {
  if (probe.errorDetail) {
    return [
      {
        route: probe.route.path,
        routeLabel: probe.route.label,
        viewport: probe.viewport,
        lane: "overflow",
        behavior: "rich content probe",
        detail: probe.errorDetail,
      },
    ];
  }

  return [
    ...auditScrollSurface(probe.table, "table", probe.route, probe.viewport),
    ...auditScrollSurface(probe.code, "code", probe.route, probe.viewport),
    ...auditScrollSurface(probe.math, "math", probe.route, probe.viewport),
  ];
}

export type RichContentDomMetrics = {
  innerWidth: number;
  table: RichContentScrollProbe | null;
  code: RichContentScrollProbe | null;
  math: RichContentScrollProbe | null;
};

type ScrollElementMetrics = {
  right: number;
  clientWidth: number;
  scrollWidth: number;
  overflowX: string;
};

/** Browser-side helper for Playwright page.evaluate rich-content probes. */
export function collectRichContentDomMetrics(): RichContentDomMetrics {
  const innerWidth = window.innerWidth;

  function readScrollProbe(
    metrics: ScrollElementMetrics | null,
  ): RichContentScrollProbe | null {
    if (!metrics) {
      return null;
    }

    const needsScroll = metrics.scrollWidth > metrics.clientWidth + 1;
    const scrollable =
      metrics.overflowX === "auto" ||
      metrics.overflowX === "scroll" ||
      metrics.overflowX === "overlay";
    const contained = metrics.right <= innerWidth + 1;

    return {
      contained,
      scrollable,
      needsScroll,
    };
  }

  function readElement(selector: string): ScrollElementMetrics | null {
    const element = document.querySelector(selector);
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      right: rect.right,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: style.overflowX,
    };
  }

  const table = readElement('[data-rich-content-scroll="table"]');
  const code = readElement('[data-rich-content-scroll="code"]');

  const mathElements = [
    ...document.querySelectorAll('[data-rich-content-scroll="math"]'),
  ].map((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      right: rect.right,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: style.overflowX,
    } satisfies ScrollElementMetrics;
  });

  const math =
    mathElements.length === 0
      ? null
      : mathElements.reduce<RichContentScrollProbe | null>((worst, metrics) => {
          const probe = readScrollProbe(metrics);
          if (!probe) {
            return worst;
          }
          if (!worst) {
            return probe;
          }
          if (!probe.contained || !probe.scrollable) {
            return probe;
          }
          return worst;
        }, null);

  return {
    innerWidth,
    table: readScrollProbe(table),
    code: readScrollProbe(code),
    math,
  };
}
