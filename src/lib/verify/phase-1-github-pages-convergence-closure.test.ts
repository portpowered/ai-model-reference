import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  assertBatch014StaticRegressionRowsPassOrUncertain,
  assertExportCommandPathFailureIsActionable,
  assertPhase1GitHubPagesConvergenceClosureReady,
  BATCH_014_STATIC_REGRESSION_INVENTORY,
  parsePhase1GitHubPagesConvergenceReport,
  toPhase1GitHubPagesConvergenceClosureSummary,
} from "./phase-1-github-pages-convergence-closure";
import {
  buildPhase1GitHubPagesConvergenceEvidenceSummary,
  formatPhase1GitHubPagesConvergenceEvidenceSummary,
  PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-github-pages-convergence-evidence";
import {
  EXPORT_BUILD_SUCCESS_ROUTE_MARKER,
  EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER,
} from "./phase-1-github-pages-export-command-path";
import { STATIC_REGRESSION_QUERIES } from "./phase-1-github-pages-static-regression";
import { runPhase1GitHubPagesStaticRegressionChecks } from "./phase-1-github-pages-static-regression-http";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { buildSearchPageExportShellStubBody } from "./phase-1-search-export-shell-checks";

const GQA_URL = PHASE_1_GROUPED_QUERY_ATTENTION_URL;

function successfulBuildExportOutput(): string {
  return [
    `${EXPORT_BUILD_SUCCESS_ROUTE_MARKER} (7 paths in out).`,
    `${EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER} (3 queries in out).`,
  ].join("\n");
}

function writeMinimalPassingOutFixture(rootDir: string): void {
  const outDir = join(rootDir, "out");
  mkdirSync(join(outDir, "docs", "modules"), { recursive: true });
  mkdirSync(join(outDir, "tags"), { recursive: true });
  writeFileSync(join(outDir, "index.html"), "<html>Model Atlas</html>");
  writeFileSync(
    join(outDir, "search.html"),
    `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
  );
  writeFileSync(
    join(outDir, "docs", "architecture.html"),
    "<html>Architecture Token</html>",
  );
  writeFileSync(
    join(outDir, "docs", "glossary.html"),
    "<html>Glossary Token</html>",
  );
  writeFileSync(
    join(outDir, "tags", "attention.html"),
    '<html>Attention <a href="/docs/modules/grouped-query-attention">GQA</a><a href="/docs/glossary/token">Token</a><a href="/search?tag=attention">Search</a></html>',
  );
  writeFileSync(
    join(outDir, "tags.html"),
    '<html>Tags <a href="/tags/attention">Attention</a></html>',
  );
  writeFileSync(
    join(outDir, "docs", "modules", "grouped-query-attention.html"),
    `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
  );
}

async function buildFullPassingStaticRegressionRows() {
  return runPhase1GitHubPagesStaticRegressionChecks("http://127.0.0.1:3200", {
    queries: STATIC_REGRESSION_QUERIES,
    runSearchPageQueryCheck: async () => ({
      resultUrls: [GQA_URL, "/docs/glossary/token"],
      matchedTagsVisible: false,
      hasResults: true,
      hasEmpty: false,
    }),
    runSearchDialogQueryCheck: async () => ({
      resultUrls: [GQA_URL],
      matchedTagsVisible: false,
      hasResults: true,
      hasEmpty: false,
    }),
    fetchHomeHtml: async () => `
      <header>
        <button data-search="" aria-label="Open search">Search</button>
      </header>
      <main><article><h1>Model Atlas</h1></article></main>
    `,
    fetchGqaModuleHtml: async () =>
      `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
  });
}

describe("parsePhase1GitHubPagesConvergenceReport", () => {
  test("parses domain rows, indented check rows, and recommendation footer", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-parse-report-"));
    writeMinimalPassingOutFixture(dir);
    const staticRegressionRows = await buildFullPassingStaticRegressionRows();

    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(
      buildPhase1GitHubPagesConvergenceEvidenceSummary({
        buildExportOutput: successfulBuildExportOutput(),
        buildExportExitCode: 0,
        cwd: dir,
        basePath: "",
        staticServerLifecycleStatus: "pass",
        staticRegressionRows,
      }),
    );

    const parsed = parsePhase1GitHubPagesConvergenceReport(report);

    expect(parsed.domains).toHaveLength(4);
    expect(parsed.domains.map((domain) => domain.domainId)).toEqual([
      "export-command-path",
      "export-artifact",
      "static-server-command-path",
      "phase-1-static-regression",
    ]);
    expect(parsed.checkRows.length).toBeGreaterThan(14);
    expect(parsed.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(parsed.rationale).toMatch(
      /non-blocking|static search\/route regression probes passed/,
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("returns empty report when summary header is missing", () => {
    expect(parsePhase1GitHubPagesConvergenceReport("no summary")).toEqual({
      domains: [],
      checkRows: [],
    });
  });
});

describe("assertPhase1GitHubPagesConvergenceClosureReady", () => {
  test("accepts closure-ready formatted output with full static regression inventory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-closure-assert-"));
    writeMinimalPassingOutFixture(dir);
    const staticRegressionRows = await buildFullPassingStaticRegressionRows();
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(
      buildPhase1GitHubPagesConvergenceEvidenceSummary({
        buildExportOutput: successfulBuildExportOutput(),
        buildExportExitCode: 0,
        cwd: dir,
        basePath: "",
        staticServerLifecycleStatus: "pass",
        staticRegressionRows,
      }),
    );

    const parsed = assertPhase1GitHubPagesConvergenceClosureReady(report);
    const summary = toPhase1GitHubPagesConvergenceClosureSummary(parsed);

    expect(summary.exportCommandPath.status).toBe("pass");
    expect(summary.staticServerCommandPath.status).toBe("pass");
    expect(summary.staticRegression.status).toBe("pass");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(BATCH_014_STATIC_REGRESSION_INVENTORY).toHaveLength(14);

    rmSync(dir, { recursive: true, force: true });
  });

  test("rejects output when export-command-path fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-closure-export-fail-"));
    writeMinimalPassingOutFixture(dir);
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(
      buildPhase1GitHubPagesConvergenceEvidenceSummary({
        buildExportOutput: "make build-export failed",
        buildExportExitCode: 1,
        cwd: dir,
        basePath: "",
      }),
    );

    expect(() =>
      assertPhase1GitHubPagesConvergenceClosureReady(report),
    ).toThrow(/export-command-path pass/);

    rmSync(dir, { recursive: true, force: true });
  });

  test("rejects output when static regression rows fail", async () => {
    const dir = mkdtempSync(
      join(tmpdir(), "gh-pages-closure-regression-fail-"),
    );
    writeMinimalPassingOutFixture(dir);
    const staticRegressionRows = await buildFullPassingStaticRegressionRows();
    const failingRows = staticRegressionRows.map((row) =>
      row.checkId === "static-regression.search.page.page-level-hits" &&
      row.query === "GQA"
        ? { ...row, status: "fail" as const, reason: "fragment URL in results" }
        : row,
    );
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(
      buildPhase1GitHubPagesConvergenceEvidenceSummary({
        buildExportOutput: successfulBuildExportOutput(),
        buildExportExitCode: 0,
        cwd: dir,
        basePath: "",
        staticServerLifecycleStatus: "pass",
        staticRegressionRows: failingRows,
      }),
    );

    expect(() =>
      assertPhase1GitHubPagesConvergenceClosureReady(report),
    ).toThrow(/phase-1-static-regression pass/);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("assertBatch014StaticRegressionRowsPassOrUncertain", () => {
  test("throws when any static regression row fails", () => {
    expect(() =>
      assertBatch014StaticRegressionRowsPassOrUncertain([
        {
          checkId: "static-regression.route.home-header-search-entry",
          status: "fail",
          title: "Home exposes header-only search entry",
          reason: "missing search button",
          checklistRow: "phase-1-github-pages-static-regression",
          route: "/",
        },
      ]),
    ).toThrow(/failed checkId/);
  });
});

describe("assertExportCommandPathFailureIsActionable", () => {
  test("requires repair recommendation and rationale to include lifecycle reason", () => {
    expect(() =>
      assertExportCommandPathFailureIsActionable({
        exportCommandPath: {
          domainId: "export-command-path",
          status: "fail",
          label: "Static export build command path (make build-export)",
          reason: "make build-export exited 1",
          checklistRow: "phase-1-github-pages-export-command-path",
        },
        recommendation: "queue-one-narrow-repair-batch",
        recommendationRationale:
          "Batch-014 GitHub Pages evidence failed: export-command-path (make build-export exited 1).",
      }),
    ).not.toThrow();
  });
});

describe("closure-ready report fixtures", () => {
  test("rejects output without the canonical summary header", () => {
    expect(() =>
      assertPhase1GitHubPagesConvergenceClosureReady("no summary here"),
    ).toThrow(
      /Expected Phase 1 batch-014 GitHub Pages convergence evidence summary/,
    );
  });

  test("includes the canonical summary header when built from evidence summary", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-closure-header-"));
    writeMinimalPassingOutFixture(dir);
    const staticRegressionRows = await buildFullPassingStaticRegressionRows();
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(
      buildPhase1GitHubPagesConvergenceEvidenceSummary({
        buildExportOutput: successfulBuildExportOutput(),
        buildExportExitCode: 0,
        cwd: dir,
        basePath: "",
        staticServerLifecycleStatus: "pass",
        staticRegressionRows,
      }),
    );

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    assertPhase1GitHubPagesConvergenceClosureReady(report);

    rmSync(dir, { recursive: true, force: true });
  });
});
