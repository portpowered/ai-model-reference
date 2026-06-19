import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  deriveVerifierCommandPathEvidence,
  formatVerifierCommandPathEvidenceLine,
  type VerifierCommandPathEvidence,
  type VerifierCommandPathStatus,
} from "./phase-1-built-app-verifier-command-path";
import { parseCustomerAskConvergenceReport } from "./phase-1-convergence-evidence";

export const PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER =
  "Phase 1 batch-012 convergence evidence summary";

export const BATCH_012_CUSTOMER_ASK_CONVERGENCE_DOMAIN_ID =
  "customer-ask-convergence" as const;

export const BATCH_012_CUSTOMER_ASK_CONVERGENCE_DOMAIN_LABEL =
  "Customer-ask convergence checks";

export const BATCH_012_CUSTOMER_ASK_CONVERGENCE_CHECKLIST_ROW =
  "phase-1-batch-012-customer-ask-convergence";

export type Phase1Batch012ConvergenceRecommendation =
  | "queue-one-narrow-repair-batch"
  | "stop-and-wait-for-phase-advancement";

export type Batch012CustomerAskConvergenceDomainSummary = {
  domainId: typeof BATCH_012_CUSTOMER_ASK_CONVERGENCE_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: VerifierCommandPathStatus;
  rows: readonly CustomerAskConvergenceRow[];
};

export type Phase1Batch012ConvergenceEvidenceSummary = {
  commandPath: VerifierCommandPathEvidence;
  customerAsk: Batch012CustomerAskConvergenceDomainSummary;
  recommendation: Phase1Batch012ConvergenceRecommendation;
  recommendationRationale: string;
};

export type BuildPhase1Batch012ConvergenceEvidenceSummaryInput = {
  verifyOutput: string;
  /** When set, command-path evidence is uncertain (non-canonical run). */
  verifyBaseUrl?: string | undefined;
  customerAskRows?: readonly CustomerAskConvergenceRow[];
};

function aggregateStatuses(
  statuses: readonly VerifierCommandPathStatus[],
): VerifierCommandPathStatus {
  if (statuses.some((status) => status === "fail")) {
    return "fail";
  }
  if (statuses.some((status) => status === "uncertain")) {
    return "uncertain";
  }
  return "pass";
}

function summarizeCustomerAskDomain(
  rows: readonly CustomerAskConvergenceRow[],
): Batch012CustomerAskConvergenceDomainSummary {
  return {
    domainId: BATCH_012_CUSTOMER_ASK_CONVERGENCE_DOMAIN_ID,
    label: BATCH_012_CUSTOMER_ASK_CONVERGENCE_DOMAIN_LABEL,
    checklistRow: BATCH_012_CUSTOMER_ASK_CONVERGENCE_CHECKLIST_ROW,
    status: aggregateStatuses(rows.map((row) => row.status)),
    rows,
  };
}

export function derivePhase1Batch012ConvergenceRecommendation(input: {
  commandPath: VerifierCommandPathEvidence;
  customerAskRows: readonly CustomerAskConvergenceRow[];
}): {
  recommendation: Phase1Batch012ConvergenceRecommendation;
  rationale: string;
} {
  const failingCustomerAskRows = input.customerAskRows.filter(
    (row) => row.status === "fail",
  );
  if (
    input.commandPath.status === "fail" ||
    failingCustomerAskRows.length > 0
  ) {
    const failureParts: string[] = [];
    if (input.commandPath.status === "fail") {
      failureParts.push(
        `verifier command-path (${input.commandPath.reason ?? "lifecycle failure"})`,
      );
    }
    if (failingCustomerAskRows.length > 0) {
      failureParts.push(
        `customer-ask checkId(s): ${failingCustomerAskRows.map((row) => row.checkId).join(", ")}`,
      );
    }
    return {
      recommendation: "queue-one-narrow-repair-batch",
      rationale: `Batch-012 evidence failed: ${failureParts.join("; ")}. Queue one narrow repair batch before Phase 1 stop-and-wait.`,
    };
  }

  const uncertainCustomerAskRows = input.customerAskRows.filter(
    (row) => row.status === "uncertain",
  );
  const uncertainParts: string[] = [];
  if (input.commandPath.status === "uncertain") {
    uncertainParts.push(
      `verifier command-path (${input.commandPath.reason ?? "non-canonical or insufficient output"})`,
    );
  }
  if (uncertainCustomerAskRows.length > 0) {
    uncertainParts.push(
      `customer-ask checkId(s): ${uncertainCustomerAskRows.map((row) => row.checkId).join(", ")}`,
    );
  }

  if (uncertainParts.length > 0) {
    return {
      recommendation: "stop-and-wait-for-phase-advancement",
      rationale: `No failing evidence; uncertain rows in ${uncertainParts.join("; ")} are non-blocking. Stop and wait for customer Phase 1 advancement with manual follow-up notes for uncertain rows.`,
    };
  }

  return {
    recommendation: "stop-and-wait-for-phase-advancement",
    rationale:
      "Verifier command-path passed and all customer-ask rows passed. Stop and wait for customer Phase 1 advancement after batch-012 repairs.",
  };
}

/**
 * Merges verifier command-path evidence with customer-ask convergence rows into
 * one planner-facing batch-012 convergence summary.
 */
export function buildPhase1Batch012ConvergenceEvidenceSummary(
  input: BuildPhase1Batch012ConvergenceEvidenceSummaryInput,
): Phase1Batch012ConvergenceEvidenceSummary {
  const commandPath = deriveVerifierCommandPathEvidence({
    output: input.verifyOutput,
    verifyBaseUrl: input.verifyBaseUrl,
  });
  const customerAskRows =
    input.customerAskRows ??
    parseCustomerAskConvergenceReport(input.verifyOutput);
  const customerAsk = summarizeCustomerAskDomain(customerAskRows);
  const recommendation = derivePhase1Batch012ConvergenceRecommendation({
    commandPath,
    customerAskRows,
  });

  return {
    commandPath,
    customerAsk,
    recommendation: recommendation.recommendation,
    recommendationRationale: recommendation.rationale,
  };
}

function formatCustomerAskCheckIdSourceLine(
  row: CustomerAskConvergenceRow,
): string {
  const status = row.status.toUpperCase();
  const reason = row.status !== "pass" && row.reason ? ` — ${row.reason}` : "";
  return `  [${status}] make internal-verify-phase-1-ux — ${row.checkId}${reason}`;
}

export function formatBatch012CustomerAskConvergenceDomainLine(
  summary: Batch012CustomerAskConvergenceDomainSummary,
): string {
  const status = summary.status.toUpperCase();
  return `[${status}] ${summary.domainId} — ${summary.label} — checklistRow=${summary.checklistRow}`;
}

export function formatPhase1Batch012ConvergenceEvidenceSummary(
  summary: Phase1Batch012ConvergenceEvidenceSummary,
): string {
  const lines = [PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER];
  lines.push(formatVerifierCommandPathEvidenceLine(summary.commandPath));
  lines.push(
    formatBatch012CustomerAskConvergenceDomainLine(summary.customerAsk),
  );
  for (const row of summary.customerAsk.rows) {
    lines.push(formatCustomerAskCheckIdSourceLine(row));
  }
  lines.push(`Recommendation: ${summary.recommendation}`);
  lines.push(`Rationale: ${summary.recommendationRationale}`);
  return lines.join("\n");
}

export type PrintPhase1Batch012ConvergenceEvidenceSummaryOptions = {
  writeLine?: (line: string) => void;
};

export function printPhase1Batch012ConvergenceEvidenceSummary(
  summary: Phase1Batch012ConvergenceEvidenceSummary,
  options: PrintPhase1Batch012ConvergenceEvidenceSummaryOptions = {},
): void {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  for (const line of formatPhase1Batch012ConvergenceEvidenceSummary(
    summary,
  ).split("\n")) {
    writeLine(line);
  }
}

/**
 * Batch-012 convergence exit semantics: fail when verifier command-path or any
 * customer-ask row fails. Uncertain evidence is non-blocking (exit 0).
 */
export function getPhase1Batch012ConvergenceExitCode(
  summary: Phase1Batch012ConvergenceEvidenceSummary,
): 0 | 1 {
  if (summary.commandPath.status === "fail") {
    return 1;
  }
  if (summary.customerAsk.rows.some((row) => row.status === "fail")) {
    return 1;
  }
  return 0;
}

export const PHASE_1_BATCH_012_CONVERGENCE_WORKFLOW_STEPS = [
  "make build",
  "make internal-verify-phase-1-ux",
] as const;

export const PHASE_1_BATCH_012_CONVERGENCE_PREREQUISITES = [
  "Bun dependencies installed (`bun install`)",
  "Playwright Chromium for live browser checks (`npx playwright install chromium`)",
  "Production build output (`.next/`) produced by `make build` inside the workflow",
  "VERIFY_BASE_URL unset for canonical default spawn path",
] as const;
