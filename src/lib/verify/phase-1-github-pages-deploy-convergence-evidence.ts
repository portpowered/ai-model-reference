import {
  type DeployDocsPostureEvidence,
  deriveDeployDocsPostureEvidenceFromRepo,
  formatDeployDocsPostureEvidenceLine,
} from "./phase-1-github-pages-deploy-documentation";
import {
  type DeployExportArtifactEvidence,
  deriveDeployExportArtifactEvidence,
  formatDeployExportArtifactEvidenceLine,
} from "./phase-1-github-pages-deploy-export-artifact";
import {
  type DeployPathSearchEvidence,
  deriveDeployPathSearchEvidence,
  formatDeployPathSearchCheckRowLine,
  formatDeployPathSearchDomainLine,
} from "./phase-1-github-pages-deploy-path-search";
import {
  type DeployWorkflowEvidence,
  deriveDeployWorkflowEvidenceFromRepo,
  formatDeployWorkflowEvidenceLine,
} from "./phase-1-github-pages-deploy-workflow";

export const PHASE_1_BATCH_015_GITHUB_PAGES_DEPLOY_CONVERGENCE_EVIDENCE_SUMMARY_HEADER =
  "Phase 1 batch-015 GitHub Pages deploy convergence evidence summary";

export type Phase1GitHubPagesDeployConvergenceRecommendation =
  | "queue-one-narrow-repair-batch"
  | "stop-and-wait-for-phase-advancement";

export type Phase1GitHubPagesDeployConvergenceEvidenceSummary = {
  deployWorkflow: DeployWorkflowEvidence;
  deployDocsPosture: DeployDocsPostureEvidence;
  exportArtifact: DeployExportArtifactEvidence;
  deployPathSearch: DeployPathSearchEvidence;
  recommendation: Phase1GitHubPagesDeployConvergenceRecommendation;
  recommendationRationale: string;
};

export type BuildPhase1GitHubPagesDeployConvergenceEvidenceSummaryInput = {
  repoRoot?: string;
  deployWorkflow?: DeployWorkflowEvidence;
  deployDocsPosture?: DeployDocsPostureEvidence;
  buildExportOutput: string;
  buildExportExitCode: number;
  outDir?: string;
  cwd?: string;
  basePath?: string;
  deployPathSearch?: DeployPathSearchEvidence;
  deployPathSearchSkipped?: boolean;
  deployPathSearchSkipReason?: string;
  deployPathSearchSkipStatus?: DeployPathSearchEvidence["status"];
};

function formatFailingDeployPathSearchCheckIds(
  rows: readonly { checkId: string; status: string }[],
): string {
  return rows
    .filter((row) => row.status === "fail")
    .map((row) => row.checkId)
    .join(", ");
}

function formatUncertainDeployPathSearchCheckIds(
  rows: readonly { checkId: string; status: string }[],
): string {
  return rows
    .filter((row) => row.status === "uncertain")
    .map((row) => row.checkId)
    .join(", ");
}

export function derivePhase1GitHubPagesDeployConvergenceRecommendation(input: {
  deployWorkflow: DeployWorkflowEvidence;
  deployDocsPosture: DeployDocsPostureEvidence;
  exportArtifact: DeployExportArtifactEvidence;
  deployPathSearch: DeployPathSearchEvidence;
}): {
  recommendation: Phase1GitHubPagesDeployConvergenceRecommendation;
  rationale: string;
} {
  const failingDeployPathSearchCheckIds = formatFailingDeployPathSearchCheckIds(
    input.deployPathSearch.rows,
  );

  if (
    input.deployWorkflow.status === "fail" ||
    input.deployDocsPosture.status === "fail" ||
    input.exportArtifact.status === "fail" ||
    input.deployPathSearch.status === "fail"
  ) {
    const failureParts: string[] = [];
    if (input.deployWorkflow.status === "fail") {
      failureParts.push(
        `deploy-workflow (${input.deployWorkflow.reason ?? "deploy workflow contract failure"})`,
      );
    }
    if (input.deployDocsPosture.status === "fail") {
      failureParts.push(
        `deploy-docs-posture (${input.deployDocsPosture.reason ?? "deploy-facing documentation contradicts workflow"})`,
      );
    }
    if (input.exportArtifact.status === "fail") {
      failureParts.push(
        `export-artifact (${input.exportArtifact.reason ?? "make internal-build-export or export-route gate failure"})`,
      );
    }
    if (input.deployPathSearch.status === "fail") {
      failureParts.push(
        failingDeployPathSearchCheckIds.length > 0
          ? `deploy-path-search checkId(s): ${failingDeployPathSearchCheckIds}`
          : `deploy-path-search (${input.deployPathSearch.reason ?? "static harness or /search probes failed"})`,
      );
    }
    return {
      recommendation: "queue-one-narrow-repair-batch",
      rationale: `Batch-015 GitHub Pages deploy evidence failed: ${failureParts.join("; ")}. Queue one narrow repair batch before Phase 1 stop-and-wait.`,
    };
  }

  const uncertainParts: string[] = [];
  if (input.deployWorkflow.status === "uncertain") {
    uncertainParts.push(
      `deploy-workflow (${input.deployWorkflow.reason ?? "ambiguous deploy workflow contract"})`,
    );
  }
  if (input.deployDocsPosture.status === "uncertain") {
    uncertainParts.push(
      `deploy-docs-posture (${input.deployDocsPosture.reason ?? "incomplete deploy-facing documentation"})`,
    );
  }
  if (input.exportArtifact.status === "uncertain") {
    uncertainParts.push(
      `export-artifact (${input.exportArtifact.reason ?? "export artifact health uncertain"})`,
    );
  }
  const uncertainDeployPathSearchCheckIds =
    formatUncertainDeployPathSearchCheckIds(input.deployPathSearch.rows);
  if (input.deployPathSearch.status === "uncertain") {
    uncertainParts.push(
      uncertainDeployPathSearchCheckIds.length > 0
        ? `deploy-path-search checkId(s): ${uncertainDeployPathSearchCheckIds}`
        : `deploy-path-search (${input.deployPathSearch.reason ?? "static harness or /search probes uncertain"})`,
    );
  }

  if (uncertainParts.length > 0) {
    return {
      recommendation: "stop-and-wait-for-phase-advancement",
      rationale: `No failing GitHub Pages deploy evidence; uncertain rows in ${uncertainParts.join("; ")} are non-blocking. Stop and wait for customer Phase 1 advancement with manual follow-up notes for uncertain rows.`,
    };
  }

  return {
    recommendation: "stop-and-wait-for-phase-advancement",
    rationale:
      "Deploy workflow and documentation align, make internal-build-export passed export-route verification, and Phase 1 deploy-path /search probes passed against the static export harness.",
  };
}

/**
 * Builds the planner-facing batch-015 GitHub Pages deploy convergence summary
 * from repository workflow/docs evidence, captured `make internal-build-export` output,
 * and deploy-path search probe rows.
 */
export function buildPhase1GitHubPagesDeployConvergenceEvidenceSummary(
  input: BuildPhase1GitHubPagesDeployConvergenceEvidenceSummaryInput,
): Phase1GitHubPagesDeployConvergenceEvidenceSummary {
  const repoRoot = input.repoRoot ?? input.cwd ?? process.cwd();

  const deployWorkflow =
    input.deployWorkflow ?? deriveDeployWorkflowEvidenceFromRepo(repoRoot);
  const deployDocsPosture =
    input.deployDocsPosture ??
    deriveDeployDocsPostureEvidenceFromRepo(repoRoot);
  const exportArtifact = deriveDeployExportArtifactEvidence({
    buildExportOutput: input.buildExportOutput,
    buildExportExitCode: input.buildExportExitCode,
    outDir: input.outDir,
    cwd: input.cwd ?? repoRoot,
    basePath: input.basePath,
  });
  const deployPathSearch =
    input.deployPathSearch ??
    deriveDeployPathSearchEvidence({
      skipped: input.deployPathSearchSkipped,
      skipReason: input.deployPathSearchSkipReason,
      skipStatus: input.deployPathSearchSkipStatus,
    });

  const recommendation = derivePhase1GitHubPagesDeployConvergenceRecommendation(
    {
      deployWorkflow,
      deployDocsPosture,
      exportArtifact,
      deployPathSearch,
    },
  );

  return {
    deployWorkflow,
    deployDocsPosture,
    exportArtifact,
    deployPathSearch,
    recommendation: recommendation.recommendation,
    recommendationRationale: recommendation.rationale,
  };
}

export function formatPhase1GitHubPagesDeployConvergenceEvidenceSummary(
  summary: Phase1GitHubPagesDeployConvergenceEvidenceSummary,
): string {
  const lines = [
    PHASE_1_BATCH_015_GITHUB_PAGES_DEPLOY_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  ];
  lines.push(formatDeployWorkflowEvidenceLine(summary.deployWorkflow));
  lines.push(formatDeployDocsPostureEvidenceLine(summary.deployDocsPosture));
  lines.push(formatDeployExportArtifactEvidenceLine(summary.exportArtifact));
  lines.push(formatDeployPathSearchDomainLine(summary.deployPathSearch));
  for (const row of summary.deployPathSearch.rows) {
    lines.push(formatDeployPathSearchCheckRowLine(row));
  }
  lines.push(`Recommendation: ${summary.recommendation}`);
  lines.push(`Rationale: ${summary.recommendationRationale}`);
  return lines.join("\n");
}

export type PrintPhase1GitHubPagesDeployConvergenceEvidenceSummaryOptions = {
  writeLine?: (line: string) => void;
};

export function printPhase1GitHubPagesDeployConvergenceEvidenceSummary(
  summary: Phase1GitHubPagesDeployConvergenceEvidenceSummary,
  options: PrintPhase1GitHubPagesDeployConvergenceEvidenceSummaryOptions = {},
): void {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  for (const line of formatPhase1GitHubPagesDeployConvergenceEvidenceSummary(
    summary,
  ).split("\n")) {
    writeLine(line);
  }
}

/**
 * GitHub Pages deploy convergence exit semantics: fail when deploy-workflow,
 * deploy-docs-posture, export-artifact, or deploy-path-search domains fail.
 * Uncertain evidence is non-blocking.
 */
export function getPhase1GitHubPagesDeployConvergenceExitCode(
  summary: Phase1GitHubPagesDeployConvergenceEvidenceSummary,
): 0 | 1 {
  if (summary.deployWorkflow.status === "fail") {
    return 1;
  }
  if (summary.deployDocsPosture.status === "fail") {
    return 1;
  }
  if (summary.exportArtifact.status === "fail") {
    return 1;
  }
  if (summary.deployPathSearch.status === "fail") {
    return 1;
  }
  return 0;
}

export const PHASE_1_GITHUB_PAGES_DEPLOY_CONVERGENCE_WORKFLOW_STEPS = [
  "inspect deploy workflow and deploy-facing documentation",
  "make internal-build-export with canonical GITHUB_PAGES_BASE_PATH",
  "serve out/ on loopback static file server with project-site base path",
  "run Phase 1 deploy-path /search probes (GQA, attention, KV cache)",
] as const;

export const PHASE_1_GITHUB_PAGES_DEPLOY_CONVERGENCE_PREREQUISITES = [
  "Bun dependencies installed (`bun install`)",
  "Playwright Chromium for live browser checks on the static export server (`npx playwright install chromium`)",
  "Static export output (`out/`) produced by `make internal-build-export` inside the workflow",
  "VERIFY_BASE_URL unset for canonical default static export spawn path",
] as const;
