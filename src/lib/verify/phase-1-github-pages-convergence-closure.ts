import {
  PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  type Phase1GitHubPagesConvergenceRecommendation,
} from "./phase-1-github-pages-convergence-evidence";
import {
  EXPORT_ARTIFACT_DOMAIN_ID,
  type ExportArtifactCheckRow,
} from "./phase-1-github-pages-export-artifact";
import { EXPORT_COMMAND_PATH_DOMAIN_ID } from "./phase-1-github-pages-export-command-path";
import {
  STATIC_REGRESSION_CHECKS,
  STATIC_REGRESSION_DOMAIN_ID,
  STATIC_REGRESSION_QUERIES,
  type StaticRegressionCheckRow,
} from "./phase-1-github-pages-static-regression";
import { STATIC_SERVER_COMMAND_PATH_DOMAIN_ID } from "./phase-1-github-pages-static-server-command-path";

export const BATCH_014_GITHUB_PAGES_CLOSURE_READY_RECOMMENDATIONS = [
  "stop-and-wait-for-phase-advancement",
] as const satisfies readonly Phase1GitHubPagesConvergenceRecommendation[];

export type Batch014GitHubPagesClosureReadyRecommendation =
  (typeof BATCH_014_GITHUB_PAGES_CLOSURE_READY_RECOMMENDATIONS)[number];

export type ParsedPhase1GitHubPagesConvergenceDomain = {
  domainId: string;
  status: "pass" | "fail" | "uncertain";
  label: string;
  reason?: string;
  checklistRow: string;
};

export type ParsedPhase1GitHubPagesConvergenceCheckRow = {
  checkId: string;
  status: "pass" | "fail" | "uncertain";
  title: string;
  reason?: string;
  checklistRow: string;
  route?: string;
  query?: string;
};

export type ParsedPhase1GitHubPagesConvergenceReport = {
  domains: ParsedPhase1GitHubPagesConvergenceDomain[];
  checkRows: ParsedPhase1GitHubPagesConvergenceCheckRow[];
  recommendation?: Phase1GitHubPagesConvergenceRecommendation;
  rationale?: string;
};

const GITHUB_PAGES_DOMAIN_LINE_PATTERN =
  /^\[(PASS|FAIL|UNCERTAIN)\] ([^\s]+) — (.+) — checklistRow=(.+)$/;

const GITHUB_PAGES_CHECK_ROW_LINE_PATTERN =
  /^\s+\[(PASS|FAIL|UNCERTAIN)\] ([^\s]+) — (.+) — checklistRow=(.+)$/;

export const BATCH_014_STATIC_REGRESSION_INVENTORY: readonly {
  checkId: string;
  route: string;
  query?: string;
}[] = [
  ...STATIC_REGRESSION_QUERIES.flatMap((query) => [
    {
      checkId: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
      route: "/search",
      query,
    },
    {
      checkId: STATIC_REGRESSION_CHECKS.searchPageNoMatchedTags.checkId,
      route: "/search",
      query,
    },
    {
      checkId: STATIC_REGRESSION_CHECKS.searchDialogPageLevelHits.checkId,
      route: "header-dialog",
      query,
    },
    {
      checkId: STATIC_REGRESSION_CHECKS.searchDialogNoMatchedTags.checkId,
      route: "header-dialog",
      query,
    },
  ]),
  {
    checkId: STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.checkId,
    route: "/",
  },
  {
    checkId: STATIC_REGRESSION_CHECKS.gqaModulePresentation.checkId,
    route: "/docs/modules/grouped-query-attention",
  },
];

function parseLocationAndReason(remainder: string, status: string) {
  let route: string | undefined;
  let query: string | undefined;
  let title = remainder;
  let reason: string | undefined;

  const locationStart = remainder.search(/ \((route=)/);
  if (locationStart !== -1) {
    title = remainder.slice(0, locationStart);
    const locationAndReason = remainder.slice(locationStart);
    const locationMatch = locationAndReason.match(
      /^ \((route=[^)]+)\)(?: — (.+))?$/,
    );
    if (locationMatch) {
      const location = locationMatch[1];
      route = location.match(/route=([^,)]+)/)?.[1];
      query = location.match(/query=([^,)]+)/)?.[1];
      if (status !== "pass" && locationMatch[2]) {
        reason = locationMatch[2];
      }
    }
  } else if (status !== "pass" && remainder.includes(" — ")) {
    const lastSeparator = remainder.lastIndexOf(" — ");
    reason = remainder.slice(lastSeparator + 3);
    title = remainder.slice(0, lastSeparator);
  }

  return { title, reason, route, query };
}

function parseDomainLine(
  line: string,
): ParsedPhase1GitHubPagesConvergenceDomain | undefined {
  const match = line.match(GITHUB_PAGES_DOMAIN_LINE_PATTERN);
  if (!match) {
    return undefined;
  }

  const status =
    match[1].toLowerCase() as ParsedPhase1GitHubPagesConvergenceDomain["status"];
  const domainId = match[2];
  const checklistRow = match[4];
  const { title, reason } = parseLocationAndReason(match[3], status);

  return {
    domainId,
    status,
    label: title,
    reason,
    checklistRow,
  };
}

function parseCheckRowLine(
  line: string,
): ParsedPhase1GitHubPagesConvergenceCheckRow | undefined {
  const match = line.match(GITHUB_PAGES_CHECK_ROW_LINE_PATTERN);
  if (!match) {
    return undefined;
  }

  const status =
    match[1].toLowerCase() as ParsedPhase1GitHubPagesConvergenceCheckRow["status"];
  const checkId = match[2];
  const checklistRow = match[4];
  const { title, reason, route, query } = parseLocationAndReason(
    match[3],
    status,
  );

  return {
    checkId,
    status,
    title,
    reason,
    checklistRow,
    route,
    query,
  };
}

/**
 * Parses the batch-014 GitHub Pages convergence evidence summary emitted by
 * `run-phase-1-github-pages-convergence-pass.ts`.
 */
export function parsePhase1GitHubPagesConvergenceReport(
  output: string,
): ParsedPhase1GitHubPagesConvergenceReport {
  const lines = output.split(/\r?\n/);
  const headerIndex = lines.findIndex(
    (line) =>
      line.trim() ===
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  );
  if (headerIndex === -1) {
    return { domains: [], checkRows: [] };
  }

  const domains: ParsedPhase1GitHubPagesConvergenceDomain[] = [];
  const checkRows: ParsedPhase1GitHubPagesConvergenceCheckRow[] = [];
  let recommendation: Phase1GitHubPagesConvergenceRecommendation | undefined;
  let rationale: string | undefined;

  for (const line of lines.slice(headerIndex + 1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const recommendationMatch = trimmed.match(/^Recommendation: (.+)$/);
    if (recommendationMatch) {
      recommendation =
        recommendationMatch[1] as Phase1GitHubPagesConvergenceRecommendation;
      continue;
    }

    const rationaleMatch = trimmed.match(/^Rationale: (.+)$/);
    if (rationaleMatch) {
      rationale = rationaleMatch[1];
      continue;
    }

    const domain = /^\s/.test(line) ? undefined : parseDomainLine(trimmed);
    if (domain) {
      domains.push(domain);
      continue;
    }

    const checkRow = parseCheckRowLine(line);
    if (checkRow) {
      checkRows.push(checkRow);
    }
  }

  return { domains, checkRows, recommendation, rationale };
}

function findDomain(
  report: ParsedPhase1GitHubPagesConvergenceReport,
  domainId: string,
): ParsedPhase1GitHubPagesConvergenceDomain | undefined {
  return report.domains.find((domain) => domain.domainId === domainId);
}

export function assertBatch014StaticRegressionRowsPassOrUncertain(
  rows: readonly ParsedPhase1GitHubPagesConvergenceCheckRow[],
): ParsedPhase1GitHubPagesConvergenceCheckRow[] {
  const staticRegressionRows = rows.filter(
    (row) => row.checklistRow === "phase-1-github-pages-static-regression",
  );
  const failingRows = staticRegressionRows.filter(
    (row) => row.status === "fail",
  );
  if (failingRows.length > 0) {
    throw new Error(
      `Expected no failing static regression rows for closure readiness; failed checkId(s): ${failingRows.map((row) => row.checkId).join(", ")}`,
    );
  }

  const undocumentedUncertain = staticRegressionRows.filter(
    (row) => row.status === "uncertain" && !row.reason?.trim(),
  );
  if (undocumentedUncertain.length > 0) {
    throw new Error(
      `Expected human-readable reasons on uncertain static regression rows: ${undocumentedUncertain.map((row) => row.checkId).join(", ")}`,
    );
  }

  return staticRegressionRows;
}

function assertBatch014StaticRegressionInventory(
  rows: readonly ParsedPhase1GitHubPagesConvergenceCheckRow[],
): void {
  for (const entry of BATCH_014_STATIC_REGRESSION_INVENTORY) {
    const matchingRows = rows.filter((row) => {
      if (row.checkId !== entry.checkId) {
        return false;
      }
      if (row.route !== entry.route) {
        return false;
      }
      if (entry.query === undefined) {
        return row.query === undefined;
      }
      return row.query === entry.query;
    });
    if (matchingRows.length === 0) {
      throw new Error(
        `Expected static regression row for inventory checkId ${entry.checkId} route=${entry.route}${entry.query ? ` query=${entry.query}` : ""}`,
      );
    }
  }
}

function assertExportArtifactRowsPassOrUncertain(
  rows: readonly ParsedPhase1GitHubPagesConvergenceCheckRow[],
): void {
  const artifactRows = rows.filter(
    (row) => row.checklistRow === "phase-1-github-pages-export-artifact",
  );
  const failingRows = artifactRows.filter((row) => row.status === "fail");
  if (failingRows.length > 0) {
    throw new Error(
      `Expected no failing export-artifact rows for closure readiness; failed checkId(s): ${failingRows.map((row) => row.checkId).join(", ")}`,
    );
  }
}

/**
 * Asserts captured batch-014 GitHub Pages convergence output is strong enough to
 * stop-and-wait for Phase 1 advancement after batch-014 repairs land.
 */
export function assertPhase1GitHubPagesConvergenceClosureReady(
  output: string,
): ParsedPhase1GitHubPagesConvergenceReport {
  if (
    !output.includes(
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    )
  ) {
    throw new Error(
      "Expected Phase 1 batch-014 GitHub Pages convergence evidence summary in output",
    );
  }

  const report = parsePhase1GitHubPagesConvergenceReport(output);
  const exportCommandPath = findDomain(report, EXPORT_COMMAND_PATH_DOMAIN_ID);
  if (exportCommandPath?.status !== "pass") {
    throw new Error(
      `Expected export-command-path pass for closure readiness, got ${exportCommandPath?.status ?? "missing"}${exportCommandPath?.reason ? `: ${exportCommandPath.reason}` : ""}`,
    );
  }

  const exportArtifact = findDomain(report, EXPORT_ARTIFACT_DOMAIN_ID);
  if (!exportArtifact || exportArtifact.status === "fail") {
    throw new Error(
      `Expected export-artifact pass or uncertain for closure readiness, got ${exportArtifact?.status ?? "missing"}${exportArtifact?.reason ? `: ${exportArtifact.reason}` : ""}`,
    );
  }
  assertExportArtifactRowsPassOrUncertain(report.checkRows);

  const staticServerCommandPath = findDomain(
    report,
    STATIC_SERVER_COMMAND_PATH_DOMAIN_ID,
  );
  if (staticServerCommandPath?.status !== "pass") {
    throw new Error(
      `Expected static-server-command-path pass for closure readiness, got ${staticServerCommandPath?.status ?? "missing"}${staticServerCommandPath?.reason ? `: ${staticServerCommandPath.reason}` : ""}`,
    );
  }

  const staticRegression = findDomain(report, STATIC_REGRESSION_DOMAIN_ID);
  if (staticRegression?.status !== "pass") {
    throw new Error(
      `Expected phase-1-static-regression pass for closure readiness, got ${staticRegression?.status ?? "missing"}${staticRegression?.reason ? `: ${staticRegression.reason}` : ""}`,
    );
  }

  assertBatch014StaticRegressionRowsPassOrUncertain(report.checkRows);
  assertBatch014StaticRegressionInventory(report.checkRows);

  if (
    !report.recommendation ||
    !BATCH_014_GITHUB_PAGES_CLOSURE_READY_RECOMMENDATIONS.includes(
      report.recommendation as Batch014GitHubPagesClosureReadyRecommendation,
    )
  ) {
    throw new Error(
      `Expected closure-ready recommendation (${BATCH_014_GITHUB_PAGES_CLOSURE_READY_RECOMMENDATIONS.join(" or ")}), got ${report.recommendation ?? "missing"}`,
    );
  }

  return report;
}

export type Phase1GitHubPagesConvergenceClosureSummary = {
  exportCommandPath: ParsedPhase1GitHubPagesConvergenceDomain;
  exportArtifact: ParsedPhase1GitHubPagesConvergenceDomain;
  staticServerCommandPath: ParsedPhase1GitHubPagesConvergenceDomain;
  staticRegression: ParsedPhase1GitHubPagesConvergenceDomain;
  recommendation: Phase1GitHubPagesConvergenceRecommendation;
  recommendationRationale: string;
};

/**
 * Maps parsed report output into a summary shape aligned with other Phase 1
 * convergence closure helpers for integration-test assertions.
 */
export function toPhase1GitHubPagesConvergenceClosureSummary(
  report: ParsedPhase1GitHubPagesConvergenceReport,
): Phase1GitHubPagesConvergenceClosureSummary {
  const exportCommandPath = findDomain(report, EXPORT_COMMAND_PATH_DOMAIN_ID);
  const exportArtifact = findDomain(report, EXPORT_ARTIFACT_DOMAIN_ID);
  const staticServerCommandPath = findDomain(
    report,
    STATIC_SERVER_COMMAND_PATH_DOMAIN_ID,
  );
  const staticRegression = findDomain(report, STATIC_REGRESSION_DOMAIN_ID);

  if (
    !exportCommandPath ||
    !exportArtifact ||
    !staticServerCommandPath ||
    !staticRegression ||
    !report.recommendation ||
    !report.rationale
  ) {
    throw new Error(
      "Expected complete batch-014 GitHub Pages convergence report domains and recommendation footer",
    );
  }

  return {
    exportCommandPath,
    exportArtifact,
    staticServerCommandPath,
    staticRegression,
    recommendation: report.recommendation,
    recommendationRationale: report.rationale,
  };
}

export function assertExportCommandPathFailureIsActionable(
  summary: Pick<
    Phase1GitHubPagesConvergenceClosureSummary,
    "exportCommandPath" | "recommendation" | "recommendationRationale"
  >,
): void {
  if (summary.exportCommandPath.status !== "fail") {
    return;
  }

  const reason = summary.exportCommandPath.reason?.trim();
  if (!reason) {
    throw new Error(
      "Expected specific export-command-path failure reason for actionable repair scoping",
    );
  }

  if (summary.recommendation !== "queue-one-narrow-repair-batch") {
    throw new Error(
      `Expected queue-one-narrow-repair-batch recommendation for export-command-path fail, got ${summary.recommendation}`,
    );
  }

  if (!summary.recommendationRationale.includes(reason)) {
    throw new Error(
      "Expected recommendation rationale to include the export-command-path failure reason",
    );
  }
}

export function toStaticRegressionCheckRowsFromParsed(
  rows: readonly ParsedPhase1GitHubPagesConvergenceCheckRow[],
): StaticRegressionCheckRow[] {
  return rows
    .filter(
      (row) => row.checklistRow === "phase-1-github-pages-static-regression",
    )
    .map((row) => ({
      checkId: row.checkId,
      title: row.title,
      status: row.status,
      route: row.route as StaticRegressionCheckRow["route"],
      query: row.query,
      reason: row.reason,
      checklistRow: row.checklistRow,
    }));
}

export function toExportArtifactCheckRowsFromParsed(
  rows: readonly ParsedPhase1GitHubPagesConvergenceCheckRow[],
): ExportArtifactCheckRow[] {
  return rows
    .filter(
      (row) => row.checklistRow === "phase-1-github-pages-export-artifact",
    )
    .map((row) => ({
      checkId: row.checkId,
      title: row.title,
      status: row.status,
      reason: row.reason,
      checklistRow: row.checklistRow,
    }));
}
