import { describe, expect, test } from "bun:test";
import {
  assertGroupedQueryAttentionGraphAccessibilityConvergence,
  assertGroupedQueryAttentionGraphComparisonConvergence,
  assertGroupedQueryAttentionGraphInteractionConvergence,
  buildGroupedQueryAttentionStubBody,
} from "./grouped-query-attention-module-convergence";
import {
  auditRenderedQualityHtml,
  RENDERED_QUALITY_AUDIT_ROUTES,
} from "./rendered-quality-baseline";
import { auditRenderedQualityGraphInteraction } from "./rendered-quality-baseline-graph-interaction";

const gqaRoute = RENDERED_QUALITY_AUDIT_ROUTES.find(
  (route) => route.path === "/docs/modules/grouped-query-attention",
);
if (!gqaRoute) {
  throw new Error("missing grouped-query-attention audit route");
}

describe("rendered quality graph interaction", () => {
  test("auditRenderedQualityGraphInteraction passes when pan, zoom, and MHA toggle work", () => {
    const issues = auditRenderedQualityGraphInteraction({
      route: gqaRoute,
      viewport: "desktop",
      panChanged: true,
      zoomChanged: true,
      mhaToggleWorked: true,
    });

    expect(issues).toEqual([]);
  });

  test("auditRenderedQualityGraphInteraction reports pan, zoom, and toggle failures", () => {
    const issues = auditRenderedQualityGraphInteraction({
      route: gqaRoute,
      viewport: "mobile",
      panChanged: false,
      zoomChanged: false,
      mhaToggleWorked: false,
    });

    expect(issues.map((issue) => issue.behavior)).toEqual([
      "graph pan",
      "graph zoom",
      "attention variant comparison",
    ]);
  });

  test("GQA stub HTML passes graph theme, interaction, accessibility, and comparison checks", () => {
    const html = `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`;
    const issues = auditRenderedQualityHtml({ route: gqaRoute, html });
    const graphIssues = issues.filter((issue) => issue.lane === "graph");

    expect(
      assertGroupedQueryAttentionGraphInteractionConvergence(html),
    ).toBeNull();
    expect(
      assertGroupedQueryAttentionGraphAccessibilityConvergence(html),
    ).toBeNull();
    expect(
      assertGroupedQueryAttentionGraphComparisonConvergence(html),
    ).toBeNull();
    expect(
      graphIssues.filter(
        (issue) =>
          issue.behavior === "graph interaction markers" ||
          issue.behavior === "graph accessibility" ||
          issue.behavior === "attention variant comparison" ||
          issue.behavior === "graph node theme",
      ),
    ).toEqual([]);
  });
});
