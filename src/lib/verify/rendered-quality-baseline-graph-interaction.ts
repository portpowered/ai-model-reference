import type {
  RenderedQualityAuditRoute,
  RenderedQualityIssue,
  RenderedQualityViewportId,
} from "./rendered-quality-baseline";

export const GQA_GRAPH_INTERACTION_ROUTE =
  "/docs/modules/grouped-query-attention" as const;

export type RenderedQualityGraphInteractionProbe = {
  route: RenderedQualityAuditRoute;
  viewport: RenderedQualityViewportId;
  panChanged: boolean;
  zoomChanged: boolean;
  mhaToggleWorked: boolean;
  errorDetail?: string;
};

/**
 * Returns graph interaction issues when hydrated pan, zoom, or MHA/GQA toggle
 * behavior fails on the grouped-query-attention teaching graph.
 */
export function auditRenderedQualityGraphInteraction(
  probe: RenderedQualityGraphInteractionProbe,
): RenderedQualityIssue[] {
  const issues: RenderedQualityIssue[] = [];

  if (probe.errorDetail) {
    issues.push({
      route: probe.route.path,
      routeLabel: probe.route.label,
      viewport: probe.viewport,
      lane: "graph",
      behavior: "graph interaction probe",
      detail: probe.errorDetail,
    });
    return issues;
  }

  if (!probe.panChanged) {
    issues.push({
      route: probe.route.path,
      routeLabel: probe.route.label,
      viewport: probe.viewport,
      lane: "graph",
      behavior: "graph pan",
      detail: "viewport transform did not change after pane drag",
    });
  }

  if (!probe.zoomChanged) {
    issues.push({
      route: probe.route.path,
      routeLabel: probe.route.label,
      viewport: probe.viewport,
      lane: "graph",
      behavior: "graph zoom",
      detail: "viewport transform did not change after wheel zoom",
    });
  }

  if (!probe.mhaToggleWorked) {
    issues.push({
      route: probe.route.path,
      routeLabel: probe.route.label,
      viewport: probe.viewport,
      lane: "graph",
      behavior: "attention variant comparison",
      detail: "MHA comparison tab did not switch active graph on the canvas",
    });
  }

  return issues;
}
