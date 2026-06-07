import {
  deriveExportCommandPathEvidence,
  type ExportCommandPathEvidence,
  formatExportCommandPathEvidenceLine,
} from "./phase-1-github-pages-export-command-path";

export const PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER =
  "Phase 1 batch-014 GitHub Pages convergence evidence summary";

export type Phase1GitHubPagesConvergenceRecommendation =
  | "queue-one-narrow-repair-batch"
  | "stop-and-wait-for-phase-advancement";

export type Phase1GitHubPagesConvergenceEvidenceSummary = {
  exportCommandPath: ExportCommandPathEvidence;
  recommendation: Phase1GitHubPagesConvergenceRecommendation;
  recommendationRationale: string;
};

export type BuildPhase1GitHubPagesConvergenceEvidenceSummaryInput = {
  buildExportOutput: string;
  buildExportExitCode: number;
};

export function derivePhase1GitHubPagesConvergenceRecommendation(input: {
  exportCommandPath: ExportCommandPathEvidence;
}): {
  recommendation: Phase1GitHubPagesConvergenceRecommendation;
  rationale: string;
} {
  if (input.exportCommandPath.status === "fail") {
    return {
      recommendation: "queue-one-narrow-repair-batch",
      rationale: `Batch-014 GitHub Pages evidence failed: export-command-path (${input.exportCommandPath.reason ?? "make build-export lifecycle failure"}). Queue one narrow repair batch before Phase 1 stop-and-wait.`,
    };
  }

  if (input.exportCommandPath.status === "uncertain") {
    return {
      recommendation: "stop-and-wait-for-phase-advancement",
      rationale: `No failing export-command-path evidence; uncertain export-command-path (${input.exportCommandPath.reason ?? "insufficient build-export output"}) is non-blocking. Stop and wait for customer Phase 1 advancement with manual follow-up notes for uncertain rows.`,
    };
  }

  return {
    recommendation: "stop-and-wait-for-phase-advancement",
    rationale:
      "make build-export passed. Export-command-path evidence is green; later GitHub Pages convergence domains will be added in subsequent workflow stages.",
  };
}

/**
 * Builds the planner-facing batch-014 GitHub Pages convergence summary from
 * captured `make build-export` output. Additional domains are merged in later
 * stories as static artifact, server, and regression probes land.
 */
export function buildPhase1GitHubPagesConvergenceEvidenceSummary(
  input: BuildPhase1GitHubPagesConvergenceEvidenceSummaryInput,
): Phase1GitHubPagesConvergenceEvidenceSummary {
  const exportCommandPath = deriveExportCommandPathEvidence({
    output: input.buildExportOutput,
    exitCode: input.buildExportExitCode,
  });
  const recommendation = derivePhase1GitHubPagesConvergenceRecommendation({
    exportCommandPath,
  });

  return {
    exportCommandPath,
    recommendation: recommendation.recommendation,
    recommendationRationale: recommendation.rationale,
  };
}

export function formatPhase1GitHubPagesConvergenceEvidenceSummary(
  summary: Phase1GitHubPagesConvergenceEvidenceSummary,
): string {
  const lines = [
    PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  ];
  lines.push(formatExportCommandPathEvidenceLine(summary.exportCommandPath));
  lines.push(`Recommendation: ${summary.recommendation}`);
  lines.push(`Rationale: ${summary.recommendationRationale}`);
  return lines.join("\n");
}

export type PrintPhase1GitHubPagesConvergenceEvidenceSummaryOptions = {
  writeLine?: (line: string) => void;
};

export function printPhase1GitHubPagesConvergenceEvidenceSummary(
  summary: Phase1GitHubPagesConvergenceEvidenceSummary,
  options: PrintPhase1GitHubPagesConvergenceEvidenceSummaryOptions = {},
): void {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  for (const line of formatPhase1GitHubPagesConvergenceEvidenceSummary(
    summary,
  ).split("\n")) {
    writeLine(line);
  }
}

/**
 * GitHub Pages convergence exit semantics for the export-command-path stage:
 * fail when make build-export fails. Uncertain evidence is non-blocking.
 */
export function getPhase1GitHubPagesConvergenceExitCode(
  summary: Phase1GitHubPagesConvergenceEvidenceSummary,
): 0 | 1 {
  if (summary.exportCommandPath.status === "fail") {
    return 1;
  }
  return 0;
}

export const PHASE_1_GITHUB_PAGES_CONVERGENCE_WORKFLOW_STEPS = [
  "make build-export",
] as const;

export const PHASE_1_GITHUB_PAGES_CONVERGENCE_PREREQUISITES = [
  "Bun dependencies installed (`bun install`)",
  "Static export output (`out/`) produced by `make build-export` inside the workflow",
] as const;
