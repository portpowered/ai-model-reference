import { describe, expect, test } from "bun:test";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  auditRenderedQualityHtml,
  RENDERED_QUALITY_AUDIT_ROUTES,
} from "./rendered-quality-baseline";
import {
  buildRenderedQualityRegressionCatalog,
  buildRenderedQualityRegressionEvidence,
  formatRenderedQualityRegressionReport,
  getRenderedQualityRegressionExitCode,
  RENDERED_QUALITY_REGRESSION_CHECKS,
  RENDERED_QUALITY_REGRESSION_DOMAIN_ID,
  RENDERED_QUALITY_REGRESSION_TEST_FILES,
} from "./rendered-quality-regression";

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

describe("rendered quality regression catalog", () => {
  test("lists automated coverage for every fixed rendered-quality behavior lane", () => {
    const lanes = new Set(
      RENDERED_QUALITY_REGRESSION_CHECKS.map((check) => check.lane),
    );

    expect(lanes.has("page-shell")).toBe(true);
    expect(lanes.has("content-standards")).toBe(true);
    expect(lanes.has("graph")).toBe(true);
    expect(lanes.has("overflow")).toBe(true);
    expect(lanes.has("accessibility")).toBe(true);
    expect(RENDERED_QUALITY_REGRESSION_CHECKS.length).toBeGreaterThanOrEqual(
      10,
    );
  });

  test("accepts repaired GQA HTML for graph and chrome lane regressions", () => {
    const html = `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`;
    const issues = auditRenderedQualityHtml({ route: gqaRoute, html });
    const blocking = issues.filter(
      (issue) =>
        issue.behavior === "module chrome" ||
        issue.behavior === "primary graph count" ||
        issue.behavior === "graph node theme" ||
        issue.behavior === "graph interaction markers" ||
        issue.behavior === "graph accessibility" ||
        issue.behavior === "attention variant comparison" ||
        issue.behavior === "math section graph",
    );

    expect(blocking).toEqual([]);
  });

  test("treats the catalog as maintainer documentation without pass/fail acceptance status", () => {
    const evidence = buildRenderedQualityRegressionEvidence();

    expect(evidence.domainId).toBe(RENDERED_QUALITY_REGRESSION_DOMAIN_ID);
    expect(evidence.catalog).toHaveLength(
      RENDERED_QUALITY_REGRESSION_CHECKS.length,
    );
    expect(
      evidence.catalog.every(
        (entry) =>
          entry.testFiles.length > 0 &&
          entry.checkId.startsWith("rendered-regression."),
      ),
    ).toBe(true);
    expect("status" in evidence).toBe(false);
    expect(
      buildRenderedQualityRegressionCatalog().every(
        (entry) => !("status" in entry),
      ),
    ).toBe(true);
  });

  test("formats a maintainer-facing regression report with repeatable commands", () => {
    const report = formatRenderedQualityRegressionReport(
      buildRenderedQualityRegressionEvidence(),
    );

    expect(report).toContain(
      "Rendered documentation quality regression coverage",
    );
    expect(report).toContain("Maintainer catalog only");
    expect(report).toContain(
      "rendered-regression.page-shell.single-title-chrome",
    );
    expect(report).toContain("[CATALOG]");
    expect(report).toContain("bun test");
    expect(report).toContain("make verify-rendered-quality-baseline");
    expect(report).toContain("make verify-rendered-quality-regression");
    expect(report).not.toContain("Status: pass");
  });

  test("aggregates exit codes from unit tests and baseline audit only", () => {
    expect(getRenderedQualityRegressionExitCode(0, 0)).toBe(0);
    expect(getRenderedQualityRegressionExitCode(1, 0)).toBe(1);
    expect(getRenderedQualityRegressionExitCode(0, 1)).toBe(1);
  });

  test("deduplicates regression test file paths for the unit suite command", () => {
    const uniquePaths = new Set(RENDERED_QUALITY_REGRESSION_TEST_FILES);
    expect(uniquePaths.size).toBe(
      RENDERED_QUALITY_REGRESSION_TEST_FILES.length,
    );
    expect(RENDERED_QUALITY_REGRESSION_TEST_FILES.length).toBeGreaterThan(0);
  });
});
