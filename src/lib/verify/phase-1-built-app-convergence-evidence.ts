import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  deriveVerifierCommandPathEvidence,
  formatVerifierCommandPathEvidenceLine,
  type VerifierCommandPathEvidence,
  type VerifierCommandPathStatus,
} from "./phase-1-built-app-verifier-command-path";
import { parseCustomerAskConvergenceReport } from "./phase-1-convergence-evidence";

export const PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER =
  "Phase 1 batch-010 built-app convergence evidence summary";

export const CUSTOMER_ASK_CONVERGENCE_DOMAIN_ID =
  "customer-ask-convergence" as const;

export const CUSTOMER_ASK_CONVERGENCE_DOMAIN_LABEL =
  "Customer-ask convergence checks";

export const CUSTOMER_ASK_CONVERGENCE_CHECKLIST_ROW =
  "phase-1-customer-ask-convergence";

export type Phase1BuiltAppConvergenceRecommendation =
  | "queue-one-narrow-repair-batch"
  | "close-verifier-harness-regression"
  | "stop-and-wait-for-phase-advancement";

export type CustomerAskConvergenceDomainSummary = {
  domainId: typeof CUSTOMER_ASK_CONVERGENCE_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: VerifierCommandPathStatus;
  rows: readonly CustomerAskConvergenceRow[];
};

export type Phase1BuiltAppConvergenceEvidenceSummary = {
  commandPath: VerifierCommandPathEvidence;
  customerAsk: CustomerAskConvergenceDomainSummary;
  recommendation: Phase1BuiltAppConvergenceRecommendation;
  recommendationRationale: string;
};

export type BuildPhase1BuiltAppConvergenceEvidenceSummaryInput = {
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
): CustomerAskConvergenceDomainSummary {
  return {
    domainId: CUSTOMER_ASK_CONVERGENCE_DOMAIN_ID,
    label: CUSTOMER_ASK_CONVERGENCE_DOMAIN_LABEL,
    checklistRow: CUSTOMER_ASK_CONVERGENCE_CHECKLIST_ROW,
    status: aggregateStatuses(rows.map((row) => row.status)),
    rows,
  };
}

export function derivePhase1BuiltAppConvergenceRecommendation(input: {
  commandPath: VerifierCommandPathEvidence;
  customerAskRows: readonly CustomerAskConvergenceRow[];
}): {
  recommendation: Phase1BuiltAppConvergenceRecommendation;
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
      rationale: `Built-app gate evidence failed: ${failureParts.join("; ")}. Queue one narrow repair batch before closing the verifier-harness regression or Phase 1 stop-and-wait.`,
    };
  }

  const uncertainCustomerAskRows = input.customerAskRows.filter(
    (row) => row.status === "uncertain",
  );
  if (
    input.commandPath.status === "uncertain" ||
    uncertainCustomerAskRows.length > 0
  ) {
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
    return {
      recommendation: "stop-and-wait-for-phase-advancement",
      rationale: `No failing evidence; uncertain rows in ${uncertainParts.join("; ")} are non-blocking. Stop and wait for customer Phase 1 advancement with manual follow-up notes for uncertain rows.`,
    };
  }

  return {
    recommendation: "close-verifier-harness-regression",
    rationale:
      "Verifier command-path passed and all customer-ask rows passed. Close the batch-010 verifier-harness regression workstream.",
  };
}

/**
 * Merges verifier command-path evidence with customer-ask convergence rows into
 * one planner-facing batch-010 built-app convergence summary.
 */
export function buildPhase1BuiltAppConvergenceEvidenceSummary(
  input: BuildPhase1BuiltAppConvergenceEvidenceSummaryInput,
): Phase1BuiltAppConvergenceEvidenceSummary {
  const commandPath = deriveVerifierCommandPathEvidence({
    output: input.verifyOutput,
    verifyBaseUrl: input.verifyBaseUrl,
  });
  const customerAskRows =
    input.customerAskRows ??
    parseCustomerAskConvergenceReport(input.verifyOutput);
  const customerAsk = summarizeCustomerAskDomain(customerAskRows);
  const recommendation = derivePhase1BuiltAppConvergenceRecommendation({
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

export function formatCustomerAskConvergenceDomainLine(
  summary: CustomerAskConvergenceDomainSummary,
): string {
  const status = summary.status.toUpperCase();
  return `[${status}] ${summary.domainId} — ${summary.label} — checklistRow=${summary.checklistRow}`;
}

export function formatPhase1BuiltAppConvergenceEvidenceSummary(
  summary: Phase1BuiltAppConvergenceEvidenceSummary,
): string {
  const lines = [
    PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  ];
  lines.push(formatVerifierCommandPathEvidenceLine(summary.commandPath));
  lines.push(formatCustomerAskConvergenceDomainLine(summary.customerAsk));
  for (const row of summary.customerAsk.rows) {
    lines.push(formatCustomerAskCheckIdSourceLine(row));
  }
  lines.push(`Recommendation: ${summary.recommendation}`);
  lines.push(`Rationale: ${summary.recommendationRationale}`);
  return lines.join("\n");
}

export type PrintPhase1BuiltAppConvergenceEvidenceSummaryOptions = {
  writeLine?: (line: string) => void;
};

export function printPhase1BuiltAppConvergenceEvidenceSummary(
  summary: Phase1BuiltAppConvergenceEvidenceSummary,
  options: PrintPhase1BuiltAppConvergenceEvidenceSummaryOptions = {},
): void {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  for (const line of formatPhase1BuiltAppConvergenceEvidenceSummary(
    summary,
  ).split("\n")) {
    writeLine(line);
  }
}

/**
 * Built-app convergence exit semantics: fail when verifier command-path or any
 * customer-ask row fails. Uncertain evidence is non-blocking (exit 0).
 */
export function getPhase1BuiltAppConvergenceExitCode(
  summary: Phase1BuiltAppConvergenceEvidenceSummary,
): 0 | 1 {
  if (summary.commandPath.status === "fail") {
    return 1;
  }
  if (summary.customerAsk.rows.some((row) => row.status === "fail")) {
    return 1;
  }
  return 0;
}

export const PHASE_1_BUILT_APP_CONVERGENCE_WORKFLOW_STEPS = [
  "make build",
  "make internal-verify-phase-1-ux",
] as const;

export const PHASE_1_BUILT_APP_CONVERGENCE_PREREQUISITES = [
  "Bun dependencies installed (`bun install`)",
  "Playwright Chromium for live browser checks (`npx playwright install chromium`)",
  "Production build output (`.next/`) produced by `make build` inside the workflow",
  "VERIFY_BASE_URL unset for canonical default spawn path",
] as const;
