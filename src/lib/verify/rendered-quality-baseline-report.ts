import type {
  RenderedQualityAuditResult,
  RenderedQualityIssue,
} from "./rendered-quality-baseline";
import { RENDERED_QUALITY_BASELINE_REPORT_HEADER } from "./rendered-quality-baseline";

function formatIssueLine(issue: RenderedQualityIssue): string {
  return `- [${issue.lane}] ${issue.route} (${issue.viewport}) — ${issue.behavior}: ${issue.detail}`;
}

export function formatRenderedQualityAuditReport(
  result: RenderedQualityAuditResult,
): string {
  const lines = [
    `# ${RENDERED_QUALITY_BASELINE_REPORT_HEADER}`,
    "",
    `Audited at (UTC): ${result.auditedAtUtc}`,
    `Routes visited: ${result.routesVisited}`,
    `Viewport checks: ${result.viewportChecks}`,
    "",
    "## Standards baseline",
    "",
    `- docs/quality-documents-standards.md present: ${result.standards.qualityDocumentsStandardsPresent ? "yes" : "no"}`,
  ];

  if (result.standards.qualityDocumentsStandardsGap) {
    lines.push(
      `- Documentation gap: ${result.standards.qualityDocumentsStandardsGap}`,
    );
  }

  lines.push(
    `- Active standards: ${result.standards.activeStandards.join(", ")}`,
    "",
    "## Implementation-facing issue list",
    "",
  );

  if (result.issues.length === 0) {
    lines.push(
      "No high-impact rendered failures were recorded in this audit pass.",
    );
  } else {
    const lanes = [
      "route-renders",
      "page-shell",
      "content-standards",
      "graph",
      "overflow",
      "accessibility",
    ] as const;

    for (const lane of lanes) {
      const laneIssues = result.issues.filter((issue) => issue.lane === lane);
      if (laneIssues.length === 0) {
        continue;
      }
      lines.push(`### ${lane}`, "");
      for (const issue of laneIssues) {
        lines.push(formatIssueLine(issue));
      }
      lines.push("");
    }
  }

  lines.push(
    "## Manual follow-up",
    "",
    "- Re-run `bun run verify:rendered-quality-baseline` after `make build` when validating fixes from stories 002–007.",
    "- Graph pan/zoom and MHA/GQA toggle probes run automatically for grouped-query-attention during this audit; pair remaining manual checks with desktop and mobile focus and keyboard navigation when those lanes are in scope.",
    "",
  );

  return lines.join("\n");
}

export function printRenderedQualityAuditReport(
  result: RenderedQualityAuditResult,
  options: { writeLine?: (line: string) => void } = {},
): void {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  for (const line of formatRenderedQualityAuditReport(result).split("\n")) {
    writeLine(line);
  }
}
