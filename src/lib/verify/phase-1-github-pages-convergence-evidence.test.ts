import { describe, expect, test } from "bun:test";
import {
  buildPhase1GitHubPagesConvergenceEvidenceSummary,
  formatPhase1GitHubPagesConvergenceEvidenceSummary,
  getPhase1GitHubPagesConvergenceExitCode,
  PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-github-pages-convergence-evidence";
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

describe("buildPhase1GitHubPagesConvergenceEvidenceSummary", () => {
  test("marks export-command-path pass when make build-export succeeds", () => {
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
    });

    expect(summary.exportCommandPath.domainId).toBe(
      EXPORT_COMMAND_PATH_DOMAIN_ID,
    );
    expect(summary.exportCommandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
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
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: "Static export build complete.\n",
      buildExportExitCode: 0,
    });

    expect(summary.exportCommandPath.status).toBe("uncertain");
    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(0);
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
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
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
    });

    expect(getPhase1GitHubPagesConvergenceExitCode(summary)).toBe(0);
  });
});

describe("formatPhase1GitHubPagesConvergenceEvidenceSummary", () => {
  test("includes header, export-command-path domain row, and recommendation", () => {
    const summary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
    });
    const report = formatPhase1GitHubPagesConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("[PASS] export-command-path");
    expect(report).toContain(
      "checklistRow=phase-1-github-pages-export-command-path",
    );
    expect(report).toContain(
      "Recommendation: stop-and-wait-for-phase-advancement",
    );
    expect(report).toContain("Rationale:");
  });
});
