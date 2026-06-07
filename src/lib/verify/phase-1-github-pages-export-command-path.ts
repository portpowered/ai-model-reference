export const EXPORT_COMMAND_PATH_DOMAIN_ID = "export-command-path" as const;

export const EXPORT_COMMAND_PATH_DOMAIN_LABEL =
  "Static export build command path (make build-export)";

export const EXPORT_COMMAND_PATH_CHECKLIST_ROW =
  "phase-1-github-pages-export-command-path";

export type ExportCommandPathStatus = "pass" | "fail" | "uncertain";

export type ExportCommandPathEvidence = {
  domainId: typeof EXPORT_COMMAND_PATH_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: ExportCommandPathStatus;
  reason?: string;
};

export type DeriveExportCommandPathEvidenceInput = {
  output: string;
  exitCode: number;
};

export const EXPORT_BUILD_SUCCESS_ROUTE_MARKER =
  "Phase 1 export routes verified";

export const EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER =
  "Phase 1 static export search handoff verified";

const EXPORT_BUILD_FAILURE_PATTERNS: readonly RegExp[] = [
  /Phase 1 export route verification failed/i,
  /Phase 1 static export search handoff verification failed/i,
  /Failed to compile/i,
  /Build error occurred/i,
  /error: script "build:export" exited with code/i,
  /make(\[\d+\])?: \*\*\* \[build-export\] Error/i,
];

const INSUFFICIENT_OUTPUT_UNCERTAIN_REASON =
  "Captured make build-export output lacks export route and search-handoff success markers; cannot confirm export lifecycle health.";

function findExportBuildFailureReason(output: string): string | undefined {
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (
      EXPORT_BUILD_FAILURE_PATTERNS.some((pattern) => pattern.test(trimmed))
    ) {
      return trimmed;
    }
  }

  for (const pattern of EXPORT_BUILD_FAILURE_PATTERNS) {
    const match = output.match(pattern);
    if (match?.[0]) {
      return match[0].trim();
    }
  }

  return undefined;
}

function hasExportBuildSuccessMarkers(output: string): boolean {
  return (
    output.includes(EXPORT_BUILD_SUCCESS_ROUTE_MARKER) &&
    output.includes(EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER)
  );
}

function buildEvidence(
  status: ExportCommandPathStatus,
  reason?: string,
): ExportCommandPathEvidence {
  return {
    domainId: EXPORT_COMMAND_PATH_DOMAIN_ID,
    label: EXPORT_COMMAND_PATH_DOMAIN_LABEL,
    checklistRow: EXPORT_COMMAND_PATH_CHECKLIST_ROW,
    status,
    reason,
  };
}

/**
 * Derives export command-path pass/fail/uncertain evidence from captured
 * `make build-export` output and process exit code.
 */
export function deriveExportCommandPathEvidence(
  input: DeriveExportCommandPathEvidenceInput,
): ExportCommandPathEvidence {
  const lifecycleFailureReason = findExportBuildFailureReason(input.output);
  if (lifecycleFailureReason) {
    return buildEvidence("fail", lifecycleFailureReason);
  }

  if (input.exitCode !== 0) {
    const trimmedOutput = input.output.trim();
    return buildEvidence(
      "fail",
      trimmedOutput.length > 0
        ? (trimmedOutput.split(/\r?\n/).at(-1)?.trim() ??
            `make build-export exited with code ${input.exitCode}`)
        : `make build-export exited with code ${input.exitCode}`,
    );
  }

  if (hasExportBuildSuccessMarkers(input.output)) {
    return buildEvidence("pass");
  }

  return buildEvidence("uncertain", INSUFFICIENT_OUTPUT_UNCERTAIN_REASON);
}

export function formatExportCommandPathEvidenceLine(
  evidence: ExportCommandPathEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}
