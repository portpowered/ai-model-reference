import { describe, expect, test } from "bun:test";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  auditRenderedQualityHtml,
  auditRenderedQualityOverflow,
  buildRenderedQualityAuditResult,
  mergeRenderedQualityIssues,
  RENDERED_QUALITY_AUDIT_ROUTES,
} from "./rendered-quality-baseline";
import { formatRenderedQualityAuditReport } from "./rendered-quality-baseline-report";

function findAuditRoute(path: string) {
  const route = RENDERED_QUALITY_AUDIT_ROUTES.find(
    (entry) => entry.path === path,
  );
  if (!route) {
    throw new Error(`missing audit route: ${path}`);
  }
  return route;
}

const gqaRoute = findAuditRoute("/docs/modules/grouped-query-attention");
const homeRoute = findAuditRoute("/");

describe("rendered quality baseline", () => {
  test("flags duplicate title chrome and process language on home HTML", () => {
    const html = `<html><body>
      <h1>Model Atlas</h1>
      <h1>Duplicate</h1>
      <p>Phase 1 sample glossary entry for the token concept.</p>
    </body></html>`;

    const issues = auditRenderedQualityHtml({ route: homeRoute, html });
    expect(
      issues.some((issue) => issue.behavior === "duplicate title chrome"),
    ).toBe(true);
    expect(
      issues.some(
        (issue) => issue.behavior === "customer-visible process language",
      ),
    ).toBe(true);
  });

  test("does not flag canonical module pages for missing removed summary blocks", () => {
    const html = `<html><body><article data-registry-id="module.attention">
      <p>Attention shares query, key, and value projections across heads.</p>
    </article></body></html>`;

    const issues = auditRenderedQualityHtml({
      route: findAuditRoute("/docs/modules/attention"),
      html,
    });

    expect(
      issues.some((issue) => issue.behavior === "folded summary missing"),
    ).toBe(false);
  });

  test("passes grouped-query-attention stub HTML for chrome and graph lane checks", () => {
    const html = `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`;
    const issues = auditRenderedQualityHtml({ route: gqaRoute, html });
    const blocking = issues.filter(
      (issue) =>
        issue.behavior === "module chrome" ||
        issue.behavior === "primary graph count" ||
        issue.behavior === "graph node theme" ||
        issue.behavior === "graph interaction markers" ||
        issue.behavior === "graph accessibility" ||
        issue.behavior === "attention variant comparison",
    );
    expect(blocking).toEqual([]);
  });

  test("records horizontal overflow when scroll width exceeds viewport", () => {
    const issue = auditRenderedQualityOverflow({
      route: homeRoute,
      viewport: "mobile",
      scrollWidth: 420,
      innerWidth: 390,
    });

    expect(issue?.behavior).toBe("horizontal page overflow");
  });

  test("merges duplicate issues across HTML and viewport probes", () => {
    const merged = mergeRenderedQualityIssues([
      [
        {
          route: "/",
          routeLabel: "home",
          viewport: "all",
          lane: "content-standards",
          behavior: "customer-visible process language",
          detail: "matched: Phase 1",
        },
      ],
      [
        {
          route: "/",
          routeLabel: "home",
          viewport: "all",
          lane: "content-standards",
          behavior: "customer-visible process language",
          detail: "matched: Phase 1",
        },
      ],
    ]);

    expect(merged).toHaveLength(1);
  });

  test("formats audit report with rendered issue details", () => {
    const result = buildRenderedQualityAuditResult({
      issues: [
        {
          route: "/docs/glossary/vector",
          routeLabel: "vector glossary",
          viewport: "all",
          lane: "content-standards",
          behavior: "customer-visible process language",
          detail: "matched: Phase 1 bridge page",
        },
      ],
      routesVisited: 14,
      viewportChecks: 28,
      auditedAtUtc: "2026-06-11T12:00:00.000Z",
    });

    const report = formatRenderedQualityAuditReport(result);
    expect(report).toContain("Rendered quality baseline audit");
    expect(report).toContain("Phase 1 bridge page");
    expect(report).toContain("Routes visited: 14");
  });
});
