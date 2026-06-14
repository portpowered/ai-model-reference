import { describe, expect, test } from "bun:test";
import {
  buildRenderedQualityRegressionCatalogRows,
  deriveRenderedQualityRegressionEvidence,
  formatRenderedQualityRegressionReport,
  getRenderedQualityRegressionExitCode,
  RENDERED_QUALITY_REGRESSION_CHECKS,
  RENDERED_QUALITY_REGRESSION_DOMAIN_ID,
  RENDERED_QUALITY_REGRESSION_TEST_FILES,
} from "./rendered-quality-regression";

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

  test("maps each repaired behavior to named regression test files", () => {
    const rows = buildRenderedQualityRegressionCatalogRows();
    const evidence = deriveRenderedQualityRegressionEvidence(rows);

    expect(evidence.domainId).toBe(RENDERED_QUALITY_REGRESSION_DOMAIN_ID);
    expect(evidence.status).toBe("pass");
    expect(rows).toHaveLength(RENDERED_QUALITY_REGRESSION_CHECKS.length);
    expect(
      rows.every(
        (row) =>
          row.testFiles.length > 0 &&
          row.checkId.startsWith("rendered-regression."),
      ),
    ).toBe(true);
  });

  test("formats a maintainer-facing regression report with repeatable commands", () => {
    const evidence = deriveRenderedQualityRegressionEvidence(
      buildRenderedQualityRegressionCatalogRows(),
    );
    const report = formatRenderedQualityRegressionReport(evidence);

    expect(report).toContain(
      "Rendered documentation quality regression coverage",
    );
    expect(report).toContain("rendered-regression.page-shell.folded-summary");
    expect(report).toContain("bun test");
    expect(report).toContain("make verify-rendered-quality-baseline");
    expect(report).toContain("make verify-rendered-quality-regression");
  });

  test("aggregates exit codes from catalog, unit tests, and baseline audit", () => {
    const passingEvidence = deriveRenderedQualityRegressionEvidence(
      buildRenderedQualityRegressionCatalogRows(),
    );

    expect(getRenderedQualityRegressionExitCode(passingEvidence, 0, 0)).toBe(0);
    expect(getRenderedQualityRegressionExitCode(passingEvidence, 1, 0)).toBe(1);
    expect(getRenderedQualityRegressionExitCode(passingEvidence, 0, 1)).toBe(1);
  });

  test("deduplicates regression test file paths for the unit suite command", () => {
    const uniquePaths = new Set(RENDERED_QUALITY_REGRESSION_TEST_FILES);
    expect(uniquePaths.size).toBe(
      RENDERED_QUALITY_REGRESSION_TEST_FILES.length,
    );
    expect(RENDERED_QUALITY_REGRESSION_TEST_FILES.length).toBeGreaterThan(0);
  });
});
