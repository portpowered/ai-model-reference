import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

export const VERIFIER_COMMAND_PATH_DOMAIN_ID = "verifier-command-path" as const;

export const VERIFIER_COMMAND_PATH_DOMAIN_LABEL =
  "Built-app verifier command path (spawn, readiness, teardown)";

export const VERIFIER_COMMAND_PATH_CHECKLIST_ROW =
  "phase-1-built-app-verifier-harness";

export type VerifierCommandPathStatus = "pass" | "fail" | "uncertain";

export type VerifierCommandPathEvidence = {
  domainId: typeof VERIFIER_COMMAND_PATH_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: VerifierCommandPathStatus;
  reason?: string;
};

export type DeriveVerifierCommandPathEvidenceInput = {
  output: string;
  /** When set, the run skipped default spawn (non-canonical). */
  verifyBaseUrl?: string | undefined;
};

const VERIFY_BASE_URL_UNCERTAIN_REASON =
  "VERIFY_BASE_URL was set; canonical validation requires default spawn with VERIFY_BASE_URL unset.";

const INSUFFICIENT_OUTPUT_UNCERTAIN_REASON =
  "Verifier output lacks customer-ask convergence report and lifecycle failure signals; cannot distinguish command-path health from check failures.";

const LIFECYCLE_FAILURE_PATTERNS: readonly RegExp[] = [
  /Production build not found \(\.next missing\)/i,
  /did not become ready within \d+ms/i,
  /exited before becoming ready/i,
  /No free port on 127\.0\.0\.1 in \d+-\d+/i,
];

function findLifecycleFailureReason(output: string): string | undefined {
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (LIFECYCLE_FAILURE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      return trimmed;
    }
  }

  for (const pattern of LIFECYCLE_FAILURE_PATTERNS) {
    const match = output.match(pattern);
    if (match?.[0]) {
      return match[0].trim();
    }
  }

  return undefined;
}

function hasCustomerAskConvergenceReport(output: string): boolean {
  return output.includes(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER);
}

function buildEvidence(
  status: VerifierCommandPathStatus,
  reason?: string,
): VerifierCommandPathEvidence {
  return {
    domainId: VERIFIER_COMMAND_PATH_DOMAIN_ID,
    label: VERIFIER_COMMAND_PATH_DOMAIN_LABEL,
    checklistRow: VERIFIER_COMMAND_PATH_CHECKLIST_ROW,
    status,
    reason,
  };
}

/**
 * Derives verifier command-path pass/fail/uncertain evidence from captured
 * `make internal-verify-phase-1-ux` output when the canonical default spawn path is used.
 */
export function deriveVerifierCommandPathEvidence(
  input: DeriveVerifierCommandPathEvidenceInput,
): VerifierCommandPathEvidence {
  const verifyBaseUrl = input.verifyBaseUrl?.trim();
  if (verifyBaseUrl) {
    return buildEvidence("uncertain", VERIFY_BASE_URL_UNCERTAIN_REASON);
  }

  const lifecycleFailureReason = findLifecycleFailureReason(input.output);
  if (lifecycleFailureReason) {
    return buildEvidence("fail", lifecycleFailureReason);
  }

  if (hasCustomerAskConvergenceReport(input.output)) {
    return buildEvidence("pass");
  }

  if (input.output.includes(NEXT_BUILD_REQUIRED_MESSAGE)) {
    return buildEvidence("fail", NEXT_BUILD_REQUIRED_MESSAGE);
  }

  return buildEvidence("uncertain", INSUFFICIENT_OUTPUT_UNCERTAIN_REASON);
}

export function formatVerifierCommandPathEvidenceLine(
  evidence: VerifierCommandPathEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}
