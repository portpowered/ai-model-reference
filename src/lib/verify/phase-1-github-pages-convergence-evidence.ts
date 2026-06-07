import {
  deriveExportArtifactEvidence,
  type ExportArtifactEvidence,
  formatExportArtifactCheckRowLine,
  formatExportArtifactDomainLine,
} from "./phase-1-github-pages-export-artifact";
import {
  deriveExportCommandPathEvidence,
  type ExportCommandPathEvidence,
  formatExportCommandPathEvidenceLine,
} from "./phase-1-github-pages-export-command-path";
import {
  deriveStaticRegressionEvidence,
  formatStaticRegressionCheckRowLine,
  formatStaticRegressionDomainLine,
  type StaticRegressionEvidence,
} from "./phase-1-github-pages-static-regression";
import {
  deriveStaticServerCommandPathEvidence,
  formatStaticServerCommandPathEvidenceLine,
  type StaticServerCommandPathEvidence,
} from "./phase-1-github-pages-static-server-command-path";

export const PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER =
  "Phase 1 batch-014 GitHub Pages convergence evidence summary";

export type Phase1GitHubPagesConvergenceRecommendation =
  | "queue-one-narrow-repair-batch"
  | "stop-and-wait-for-phase-advancement";

export type Phase1GitHubPagesConvergenceEvidenceSummary = {
  exportCommandPath: ExportCommandPathEvidence;
  exportArtifact: ExportArtifactEvidence;
  staticServerCommandPath: StaticServerCommandPathEvidence;
  staticRegression: StaticRegressionEvidence;
  recommendation: Phase1GitHubPagesConvergenceRecommendation;
  recommendationRationale: string;
};

export type BuildPhase1GitHubPagesConvergenceEvidenceSummaryInput = {
  buildExportOutput: string;
  buildExportExitCode: number;
  outDir?: string;
  cwd?: string;
  basePath?: string;
  staticServerSkipped?: boolean;
  staticServerSkipReason?: string;
  staticServerLifecycleStatus?: "pass" | "fail";
  staticServerLifecycleReason?: string;
  staticRegressionSkipped?: boolean;
  staticRegressionSkipReason?: string;
  staticRegressionRows?: StaticRegressionEvidence["rows"];
};

function formatFailingCheckIds(
  rows: readonly { checkId: string; status: string }[],
): string {
  return rows
    .filter((row) => row.status === "fail")
    .map((row) => row.checkId)
    .join(", ");
}

function formatFailingStaticRegressionCheckIds(
  rows: readonly { checkId: string; status: string }[],
): string {
  return rows
    .filter((row) => row.status === "fail")
    .map((row) => row.checkId)
    .join(", ");
}

export function derivePhase1GitHubPagesConvergenceRecommendation(input: {
  exportCommandPath: ExportCommandPathEvidence;
  exportArtifact: ExportArtifactEvidence;
  staticServerCommandPath: StaticServerCommandPathEvidence;
  staticRegression: StaticRegressionEvidence;
}): {
  recommendation: Phase1GitHubPagesConvergenceRecommendation;
  rationale: string;
} {
  const failingArtifactCheckIds = formatFailingCheckIds(
    input.exportArtifact.rows,
  );

  const failingStaticRegressionCheckIds = formatFailingStaticRegressionCheckIds(
    input.staticRegression.rows,
  );

  if (
    input.exportCommandPath.status === "fail" ||
    input.exportArtifact.status === "fail" ||
    input.staticServerCommandPath.status === "fail" ||
    input.staticRegression.status === "fail"
  ) {
    const failureParts: string[] = [];
    if (input.exportCommandPath.status === "fail") {
      failureParts.push(
        `export-command-path (${input.exportCommandPath.reason ?? "make build-export lifecycle failure"})`,
      );
    }
    if (input.exportArtifact.status === "fail") {
      failureParts.push(
        failingArtifactCheckIds.length > 0
          ? `export-artifact checkId(s): ${failingArtifactCheckIds}`
          : "export-artifact (out/ artifact incomplete)",
      );
    }
    if (input.staticServerCommandPath.status === "fail") {
      failureParts.push(
        `static-server-command-path (${input.staticServerCommandPath.reason ?? "static export server lifecycle failure"})`,
      );
    }
    if (input.staticRegression.status === "fail") {
      failureParts.push(
        failingStaticRegressionCheckIds.length > 0
          ? `phase-1-static-regression checkId(s): ${failingStaticRegressionCheckIds}`
          : "phase-1-static-regression (static export search/route probes failed)",
      );
    }
    return {
      recommendation: "queue-one-narrow-repair-batch",
      rationale: `Batch-014 GitHub Pages evidence failed: ${failureParts.join("; ")}. Queue one narrow repair batch before Phase 1 stop-and-wait.`,
    };
  }

  const uncertainParts: string[] = [];
  if (input.exportCommandPath.status === "uncertain") {
    uncertainParts.push(
      `export-command-path (${input.exportCommandPath.reason ?? "insufficient build-export output"})`,
    );
  }
  const uncertainArtifactCheckIds = input.exportArtifact.rows
    .filter((row) => row.status === "uncertain")
    .map((row) => row.checkId)
    .join(", ");
  if (uncertainArtifactCheckIds.length > 0) {
    uncertainParts.push(
      `export-artifact checkId(s): ${uncertainArtifactCheckIds}`,
    );
  }
  if (input.staticServerCommandPath.status === "uncertain") {
    uncertainParts.push(
      `static-server-command-path (${input.staticServerCommandPath.reason ?? "static server verification skipped or incomplete"})`,
    );
  }
  const uncertainStaticRegressionCheckIds = input.staticRegression.rows
    .filter((row) => row.status === "uncertain")
    .map((row) => row.checkId)
    .join(", ");
  if (input.staticRegression.status === "uncertain") {
    uncertainParts.push(
      uncertainStaticRegressionCheckIds.length > 0
        ? `phase-1-static-regression checkId(s): ${uncertainStaticRegressionCheckIds}`
        : `phase-1-static-regression (${input.staticRegression.reason ?? "static regression probes skipped or incomplete"})`,
    );
  }

  if (uncertainParts.length > 0) {
    return {
      recommendation: "stop-and-wait-for-phase-advancement",
      rationale: `No failing GitHub Pages evidence; uncertain rows in ${uncertainParts.join("; ")} are non-blocking. Stop and wait for customer Phase 1 advancement with manual follow-up notes for uncertain rows.`,
    };
  }

  return {
    recommendation: "stop-and-wait-for-phase-advancement",
    rationale:
      "make build-export passed, export-artifact checks passed, the static export server became ready, and Phase 1 static search/route regression probes passed against the exported site.",
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
  const exportArtifact = deriveExportArtifactEvidence({
    outDir: input.outDir,
    cwd: input.cwd,
    basePath: input.basePath,
  });
  const staticServerCommandPath = deriveStaticServerCommandPathEvidence({
    skipped: input.staticServerSkipped,
    skipReason: input.staticServerSkipReason,
    lifecycleStatus: input.staticServerLifecycleStatus,
    lifecycleReason: input.staticServerLifecycleReason,
  });
  const staticRegression = deriveStaticRegressionEvidence({
    skipped: input.staticRegressionSkipped,
    skipReason: input.staticRegressionSkipReason,
    rows: input.staticRegressionRows,
  });
  const recommendation = derivePhase1GitHubPagesConvergenceRecommendation({
    exportCommandPath,
    exportArtifact,
    staticServerCommandPath,
    staticRegression,
  });

  return {
    exportCommandPath,
    exportArtifact,
    staticServerCommandPath,
    staticRegression,
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
  lines.push(formatExportArtifactDomainLine(summary.exportArtifact));
  for (const row of summary.exportArtifact.rows) {
    lines.push(formatExportArtifactCheckRowLine(row));
  }
  lines.push(
    formatStaticServerCommandPathEvidenceLine(summary.staticServerCommandPath),
  );
  lines.push(formatStaticRegressionDomainLine(summary.staticRegression));
  for (const row of summary.staticRegression.rows) {
    lines.push(formatStaticRegressionCheckRowLine(row));
  }
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
 * GitHub Pages convergence exit semantics: fail when export-command-path,
 * export-artifact, static-server-command-path, or phase-1-static-regression
 * rows fail. Uncertain evidence is non-blocking.
 */
export function getPhase1GitHubPagesConvergenceExitCode(
  summary: Phase1GitHubPagesConvergenceEvidenceSummary,
): 0 | 1 {
  if (summary.exportCommandPath.status === "fail") {
    return 1;
  }
  if (summary.exportArtifact.status === "fail") {
    return 1;
  }
  if (summary.staticServerCommandPath.status === "fail") {
    return 1;
  }
  if (summary.staticRegression.status === "fail") {
    return 1;
  }
  return 0;
}

export const PHASE_1_GITHUB_PAGES_CONVERGENCE_WORKFLOW_STEPS = [
  "make build-export",
  "serve out/ on loopback static file server",
  "run Phase 1 static search and route regression probes",
] as const;

export const PHASE_1_GITHUB_PAGES_CONVERGENCE_PREREQUISITES = [
  "Bun dependencies installed (`bun install`)",
  "Static export output (`out/`) produced by `make build-export` inside the workflow",
] as const;
