import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  EXPORT_SEARCH_HYDRATION_CHECK_ID,
  EXPORT_SEARCH_SHELL_CHECK_ID,
  mergeExportSearchConvergenceRows,
} from "./phase-1-export-search-convergence-evidence";
import {
  buildPhase1GitHubPagesConvergenceEvidenceSummary,
  formatPhase1GitHubPagesConvergenceEvidenceSummary,
  getPhase1GitHubPagesConvergenceExitCode,
  PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-github-pages-convergence-evidence";
import { EXPORT_ARTIFACT_DOMAIN_ID } from "./phase-1-github-pages-export-artifact";
import {
  EXPORT_BUILD_SUCCESS_ROUTE_MARKER,
  EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER,
  EXPORT_COMMAND_PATH_DOMAIN_ID,
} from "./phase-1-github-pages-export-command-path";
import { STATIC_REGRESSION_DOMAIN_ID } from "./phase-1-github-pages-static-regression";
import { STATIC_SERVER_COMMAND_PATH_DOMAIN_ID } from "./phase-1-github-pages-static-server-command-path";
import {
  buildSearchPageExportShellStubBody,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "./phase-1-search-export-shell-checks";

function successfulBuildExportOutput(): string {
  return [
    `${EXPORT_BUILD_SUCCESS_ROUTE_MARKER} (7 paths in out).`,
    `${EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER} (3 queries in out).`,
  ].join("\n");
}

function passingStaticRegressionRows() {
  return [
    {
      checkId: "static-regression.search.page.page-level-hits",
      title:
        "Search page lists canonical page-level hits without fragment URLs",
      status: "pass" as const,
      route: "/search" as const,
      query: "GQA",
      checklistRow: "phase-1-github-pages-static-regression",
    },
    {
      checkId: "static-regression.route.home-header-search-entry",
      title: "Home exposes header-only search entry",
      status: "pass" as const,
      route: "/" as const,
      checklistRow: "phase-1-github-pages-static-regression",
    },
  ];
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

describe("buildPhase1GitHubPagesConvergenceEvidenceSummary", () => {
  test("marks export-command-path pass when make internal-build-export succeeds", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-summary-pass-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerLifecycleStatus: "pass",
      staticRegressionRows: passingStaticRegressionRows(),
    });

    expect(summary.exportCommandPath.domainId).toBe(
      EXPORT_COMMAND_PATH_DOMAIN_ID,
    );
    expect(summary.exportCommandPath.status).toBe("pass");
    expect(summary.exportArtifact.domainId).toBe(EXPORT_ARTIFACT_DOMAIN_ID);
    expect(summary.exportArtifact.status).toBe("uncertain");
    expect(summary.staticServerCommandPath.domainId).toBe(
      STATIC_SERVER_COMMAND_PATH_DOMAIN_ID,
    );
    expect(summary.staticServerCommandPath.status).toBe("pass");
    expect(summary.staticRegression.domainId).toBe(STATIC_REGRESSION_DOMAIN_ID);
    expect(summary.staticRegression.status).toBe("pass");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");

    rmSync(dir, { recursive: true, force: true });
  });

  test("marks export-command-path fail and recommends repair when build-export fails", () => {
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: "Phase 1 export route verification failed:\n",
      buildExportExitCode: 1,
      staticServerSkipped: true,
      staticServerSkipReason:
        "Static export server verification skipped because make internal-build-export did not succeed.",
    });

    expect(summary.exportCommandPath.status).toBe("fail");
    expect(summary.staticServerCommandPath.status).toBe("uncertain");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain("export-command-path");
  });

  test("treats uncertain export-command-path as non-blocking for exit code", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-summary-uncertain-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: "Static export build complete.\n",
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerSkipped: true,
      staticServerSkipReason: "Static server not run in this fixture.",
    });

    expect(summary.exportCommandPath.status).toBe("uncertain");
    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(0);
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");

    rmSync(dir, { recursive: true, force: true });
  });

  test("marks export-artifact fail and recommends repair when out/ is incomplete", () => {
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: mkdtempSync(join(tmpdir(), "gh-pages-summary-artifact-fail-")),
      basePath: "",
      staticServerLifecycleStatus: "pass",
    });

    expect(summary.exportArtifact.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain("export-artifact");
  });

  test("marks static-regression fail and recommends repair when probe rows fail", () => {
    const dir = mkdtempSync(
      join(tmpdir(), "gh-pages-summary-regression-fail-"),
    );
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerLifecycleStatus: "pass",
      staticRegressionRows: [
        {
          checkId: "static-regression.search.page.page-level-hits",
          title:
            "Search page lists canonical page-level hits without fragment URLs",
          status: "fail",
          route: "/search",
          query: "GQA",
          reason: "first visible result URL includes a hash fragment",
          checklistRow: "phase-1-github-pages-static-regression",
        },
      ],
    });

    expect(summary.staticRegression.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain(
      "phase-1-static-regression",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("marks static-server-command-path fail and recommends repair when readiness fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-summary-server-fail-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerLifecycleStatus: "fail",
      staticServerLifecycleReason:
        "Static export file server did not become ready within 30000ms",
    });

    expect(summary.staticServerCommandPath.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain(
      "static-server-command-path",
    );

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("getPhase1GitHubPagesConvergenceExitCode", () => {
  test("returns 1 when export-command-path fails", () => {
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: "Phase 1 export route verification failed:\n",
      buildExportExitCode: 1,
    });

    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(1);
  });

  test("returns 0 when export-command-path passes", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-exit-pass-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerLifecycleStatus: "pass",
      staticRegressionRows: passingStaticRegressionRows(),
    });

    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(0);

    rmSync(dir, { recursive: true, force: true });
  });

  test("returns 1 when static-regression fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-exit-regression-fail-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerLifecycleStatus: "pass",
      staticRegressionRows: [
        {
          checkId: "static-regression.route.gqa-module-presentation",
          title: "GQA module page includes converged presentation markers",
          status: "fail",
          route: "/docs/modules/grouped-query-attention",
          reason: "missing expected content",
          checklistRow: "phase-1-github-pages-static-regression",
        },
      ],
    });

    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(1);

    rmSync(dir, { recursive: true, force: true });
  });

  test("returns 1 when static-server-command-path fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-exit-server-fail-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerLifecycleStatus: "fail",
      staticServerLifecycleReason: "Missing export directory at out",
    });

    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(1);

    rmSync(dir, { recursive: true, force: true });
  });

  test("returns 1 when export-artifact fails", () => {
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: mkdtempSync(join(tmpdir(), "gh-pages-exit-artifact-fail-")),
      basePath: "",
    });

    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(1);
  });
});

describe("export search shell vs hydration classification rows", () => {
  test("summary includes failing export-search-shell row when shell gate fails", () => {
    const shellReason = `missing expected content: ${SEARCH_PAGE_INPUT_HTML_MARKER}`;
    const staticRegressionRows = mergeExportSearchConvergenceRows([], {
      shellGate: { ok: false, reason: shellReason },
    });
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      staticServerLifecycleStatus: "pass",
      staticRegressionRows,
    });
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(summary);

    expect(report).toContain(`[FAIL] ${EXPORT_SEARCH_SHELL_CHECK_ID}`);
    expect(report).toContain("route-shell");
    expect(report).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
    expect(report).toContain(`[UNCERTAIN] ${EXPORT_SEARCH_HYDRATION_CHECK_ID}`);
    expect(report).toContain("skipped");
  });

  test("summary includes failing export-search-hydration row with query when shell passes", () => {
    const domOutcome = "search input did not hydrate on /search within 45000ms";
    const staticRegressionRows = mergeExportSearchConvergenceRows(
      [
        {
          checkId: "static-regression.search.page.page-level-hits",
          title:
            "Search page lists canonical page-level hits without fragment URLs",
          status: "fail",
          route: "/search",
          query: "GQA",
          reason: domOutcome,
          checklistRow: "phase-1-github-pages-static-regression",
        },
      ],
      {
        shellGate: { ok: true },
        hydrationProbes: [{ query: "GQA", reason: domOutcome }],
        queries: ["GQA"],
      },
    );
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      staticServerLifecycleStatus: "pass",
      staticRegressionRows,
    });
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(summary);

    expect(report).toContain(`[PASS] ${EXPORT_SEARCH_SHELL_CHECK_ID}`);
    expect(report).toContain(`[FAIL] ${EXPORT_SEARCH_HYDRATION_CHECK_ID}`);
    expect(report).toContain("hydration");
    expect(report).toContain("query=GQA");
    expect(report).toContain(domOutcome);
  });
});

describe("formatPhase1GitHubPagesConvergenceEvidenceSummary", () => {
  test("includes header, domain rows, artifact check lines, and recommendation", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-format-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
      staticServerLifecycleStatus: "pass",
      staticRegressionRows: passingStaticRegressionRows(),
    });
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("[PASS] export-command-path");
    expect(report).toContain("[PASS] static-server-command-path");
    expect(report).toContain("[PASS] phase-1-static-regression");
    expect(report).toContain("[UNCERTAIN] export-artifact");
    expect(report).toContain(
      "checklistRow=phase-1-github-pages-export-command-path",
    );
    expect(report).toContain(
      "checklistRow=phase-1-github-pages-export-artifact",
    );
    expect(report).toContain(
      "checklistRow=phase-1-github-pages-static-server-command-path",
    );
    expect(report).toContain(
      "checklistRow=phase-1-github-pages-static-regression",
    );
    expect(report).toContain("  [PASS] export-artifact.out-index-html");
    expect(report).toContain(
      "  [PASS] static-regression.search.page.page-level-hits",
    );
    expect(report).toContain(
      "Recommendation: stop-and-wait-for-phase-advancement",
    );
    expect(report).toContain("Rationale:");

    rmSync(dir, { recursive: true, force: true });
  });
});
