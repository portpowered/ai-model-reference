import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
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

function successfulBuildExportOutput(): string {
  return [
    `${EXPORT_BUILD_SUCCESS_ROUTE_MARKER} (6 paths in out).`,
    `${EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER} (3 queries in out).`,
  ].join("\n");
}

function writeMinimalPassingOutFixture(rootDir: string): void {
  const outDir = join(rootDir, "out");
  mkdirSync(join(outDir, "docs", "modules"), { recursive: true });
  mkdirSync(join(outDir, "tags"), { recursive: true });
  writeFileSync(join(outDir, "index.html"), "<html>Model Atlas</html>");
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
  test("marks export-command-path pass when make build-export succeeds", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-summary-pass-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
    });

    expect(summary.exportCommandPath.domainId).toBe(
      EXPORT_COMMAND_PATH_DOMAIN_ID,
    );
    expect(summary.exportCommandPath.status).toBe("pass");
    expect(summary.exportArtifact.domainId).toBe(EXPORT_ARTIFACT_DOMAIN_ID);
    expect(summary.exportArtifact.status).toBe("uncertain");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");

    rmSync(dir, { recursive: true, force: true });
  });

  test("marks export-command-path fail and recommends repair when build-export fails", () => {
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: "Phase 1 export route verification failed:\n",
      buildExportExitCode: 1,
    });

    expect(summary.exportCommandPath.status).toBe("fail");
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
    });

    expect(summary.exportArtifact.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain("export-artifact");
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
    });

    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(0);

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

describe("formatPhase1GitHubPagesConvergenceEvidenceSummary", () => {
  test("includes header, domain rows, artifact check lines, and recommendation", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-format-"));
    writeMinimalPassingOutFixture(dir);

    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      cwd: dir,
      basePath: "",
    });
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("[PASS] export-command-path");
    expect(report).toContain("[UNCERTAIN] export-artifact");
    expect(report).toContain(
      "checklistRow=phase-1-github-pages-export-command-path",
    );
    expect(report).toContain(
      "checklistRow=phase-1-github-pages-export-artifact",
    );
    expect(report).toContain("  [PASS] export-artifact.out-index-html");
    expect(report).toContain(
      "Recommendation: stop-and-wait-for-phase-advancement",
    );
    expect(report).toContain("Rationale:");

    rmSync(dir, { recursive: true, force: true });
  });
});
