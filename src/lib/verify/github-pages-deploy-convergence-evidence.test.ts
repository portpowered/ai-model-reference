import { describe, expect, test } from "bun:test";
import {
  buildPhase1GitHubPagesDeployConvergenceEvidenceSummary,
  derivePhase1GitHubPagesDeployConvergenceRecommendation,
  formatPhase1GitHubPagesDeployConvergenceEvidenceSummary,
  getPhase1GitHubPagesDeployConvergenceExitCode,
  PHASE_1_BATCH_015_GITHUB_PAGES_DEPLOY_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  PHASE_1_GITHUB_PAGES_DEPLOY_CONVERGENCE_WORKFLOW_STEPS,
} from "./phase-1-github-pages-deploy-convergence-evidence";
import { DEPLOY_DOCS_POSTURE_DOMAIN_ID } from "./phase-1-github-pages-deploy-documentation";
import { DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID } from "./phase-1-github-pages-deploy-export-artifact";
import {
  DEPLOY_PATH_SEARCH_DOMAIN_ID,
  type DeployPathSearchCheckRow,
} from "./phase-1-github-pages-deploy-path-search";
import { DEPLOY_WORKFLOW_DOMAIN_ID } from "./phase-1-github-pages-deploy-workflow";

function passDeployWorkflow() {
  return {
    domainId: DEPLOY_WORKFLOW_DOMAIN_ID,
    label: "Deploy workflow",
    checklistRow: "phase-1-github-pages-deploy-workflow",
    status: "pass" as const,
  };
}

function passDeployDocsPosture() {
  return {
    domainId: DEPLOY_DOCS_POSTURE_DOMAIN_ID,
    label: "Deploy docs posture",
    checklistRow: "phase-1-github-pages-deploy-documentation",
    status: "pass" as const,
  };
}

function passExportArtifact() {
  return {
    domainId: DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID,
    label: "Export artifact",
    checklistRow: "phase-1-export-route-gate",
    status: "pass" as const,
  };
}

function passDeployPathSearch(rows: readonly DeployPathSearchCheckRow[] = []) {
  return {
    domainId: DEPLOY_PATH_SEARCH_DOMAIN_ID,
    label: "Deploy path search",
    checklistRow: "phase-1-deploy-path-search",
    status: "pass" as const,
    rows,
  };
}

describe("phase-1-github-pages-deploy-convergence workflow constants", () => {
  test("workflow constants name the batch-015 GitHub Pages deploy convergence gate", () => {
    expect(
      PHASE_1_BATCH_015_GITHUB_PAGES_DEPLOY_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    ).toBe(
      "Phase 1 batch-015 GitHub Pages deploy convergence evidence summary",
    );
    expect(PHASE_1_GITHUB_PAGES_DEPLOY_CONVERGENCE_WORKFLOW_STEPS).toEqual([
      "inspect deploy workflow and deploy-facing documentation",
      "make internal-build-export with canonical GITHUB_PAGES_BASE_PATH",
      "serve out/ on loopback static file server with project-site base path",
      "run Phase 1 deploy-path /search probes (GQA, attention, KV cache)",
    ]);
  });
});

describe("derivePhase1GitHubPagesDeployConvergenceRecommendation", () => {
  test("recommends repair when any domain fails", () => {
    const result = derivePhase1GitHubPagesDeployConvergenceRecommendation({
      deployWorkflow: {
        ...passDeployWorkflow(),
        status: "fail",
        reason: "Missing deploy workflow",
      },
      deployDocsPosture: passDeployDocsPosture(),
      exportArtifact: passExportArtifact(),
      deployPathSearch: passDeployPathSearch(),
    });

    expect(result.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(result.rationale).toContain("deploy-workflow");
  });

  test("recommends stop-and-wait when only uncertain rows remain", () => {
    const result = derivePhase1GitHubPagesDeployConvergenceRecommendation({
      deployWorkflow: passDeployWorkflow(),
      deployDocsPosture: {
        ...passDeployDocsPosture(),
        status: "uncertain",
        reason: "README.md missing deploy-path marker",
      },
      exportArtifact: passExportArtifact(),
      deployPathSearch: passDeployPathSearch(),
    });

    expect(result.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(result.rationale).toContain("deploy-docs-posture");
    expect(result.rationale).toContain("non-blocking");
  });

  test("recommends stop-and-wait when all domains pass", () => {
    const result = derivePhase1GitHubPagesDeployConvergenceRecommendation({
      deployWorkflow: passDeployWorkflow(),
      deployDocsPosture: passDeployDocsPosture(),
      exportArtifact: passExportArtifact(),
      deployPathSearch: passDeployPathSearch(),
    });

    expect(result.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(result.rationale).toContain("make internal-build-export passed");
  });
});

describe("formatPhase1GitHubPagesDeployConvergenceEvidenceSummary", () => {
  test("formats all four domain rows in the evidence summary", () => {
    const summary = {
      deployWorkflow: passDeployWorkflow(),
      deployDocsPosture: passDeployDocsPosture(),
      exportArtifact: passExportArtifact(),
      deployPathSearch: passDeployPathSearch(),
      recommendation: "stop-and-wait-for-phase-advancement" as const,
      recommendationRationale: "all domains passed",
    };

    const formatted =
      formatPhase1GitHubPagesDeployConvergenceEvidenceSummary(summary);
    expect(formatted).toContain(
      PHASE_1_BATCH_015_GITHUB_PAGES_DEPLOY_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(formatted).toContain("deploy-workflow");
    expect(formatted).toContain("deploy-docs-posture");
    expect(formatted).toContain("export-artifact");
    expect(formatted).toContain("deploy-path-search");
    expect(formatted).toContain("Recommendation:");
    expect(formatted).toContain("Rationale:");
  });
});

describe("getPhase1GitHubPagesDeployConvergenceExitCode", () => {
  test("returns 1 when any domain fails and 0 for uncertain-only evidence", () => {
    const failingSummary = {
      deployWorkflow: {
        ...passDeployWorkflow(),
        status: "fail" as const,
        reason: "deploy workflow contract failure",
      },
      deployDocsPosture: passDeployDocsPosture(),
      exportArtifact: passExportArtifact(),
      deployPathSearch: passDeployPathSearch(),
      recommendation: "queue-one-narrow-repair-batch" as const,
      recommendationRationale: "failed",
    };
    expect(getPhase1GitHubPagesDeployConvergenceExitCode(failingSummary)).toBe(
      1,
    );

    const uncertainSummary = {
      deployWorkflow: passDeployWorkflow(),
      deployDocsPosture: {
        ...passDeployDocsPosture(),
        status: "uncertain" as const,
        reason: "incomplete docs",
      },
      exportArtifact: passExportArtifact(),
      deployPathSearch: passDeployPathSearch(),
      recommendation: "stop-and-wait-for-phase-advancement" as const,
      recommendationRationale: "uncertain only",
    };
    expect(
      getPhase1GitHubPagesDeployConvergenceExitCode(uncertainSummary),
    ).toBe(0);
  });
});

describe("buildPhase1GitHubPagesDeployConvergenceEvidenceSummary", () => {
  test("skips deploy-path search when upstream build-export fails", () => {
    const summary = buildPhase1GitHubPagesDeployConvergenceEvidenceSummary({
      deployWorkflow: passDeployWorkflow(),
      deployDocsPosture: passDeployDocsPosture(),
      buildExportOutput: "build failed",
      buildExportExitCode: 1,
      deployPathSearchSkipped: true,
      deployPathSearchSkipReason: "skipped because build-export failed",
      deployPathSearchSkipStatus: "uncertain",
    });

    expect(summary.exportArtifact.status).toBe("fail");
    expect(summary.deployPathSearch.status).toBe("uncertain");
    expect(summary.deployPathSearch.reason).toContain("skipped");
  });
});
