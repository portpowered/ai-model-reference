import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  PHASE_1_BATCH_009_CI_DOMAIN_DEFINITIONS,
  type Phase1Batch009BlockerDomainId,
  type Phase1CiBlockerDomainEvidence,
} from "./phase-1-convergence-pass";
import { PHASE_1_UX_SUCCESS_MESSAGE } from "./phase-1-ux-verifier";

export const PHASE_1_CONVERGENCE_EVIDENCE_SUMMARY_HEADER =
  "Phase 1 batch-009 convergence evidence summary";

export type Phase1BlockerDomainStatus = "pass" | "fail" | "uncertain";

export type Phase1ConvergenceCommandSource =
  | "make ci"
  | "make internal-verify-phase-1-ux";

export type Phase1BlockerDomainSourceEvidence = {
  source: Phase1ConvergenceCommandSource;
  status: Phase1BlockerDomainStatus;
  checkIdOrAssertion: string;
  reason?: string;
};

export type Phase1BlockerDomainSummary = {
  domainId: Phase1Batch009BlockerDomainId;
  label: string;
  checklistRow: string;
  status: Phase1BlockerDomainStatus;
  sources: readonly Phase1BlockerDomainSourceEvidence[];
};

export type Phase1ConvergenceRecommendation =
  | "stop-and-wait-for-phase-advancement"
  | "queue-one-narrow-repair-batch";

export type Phase1ConvergenceEvidenceSummary = {
  domains: readonly Phase1BlockerDomainSummary[];
  recommendation: Phase1ConvergenceRecommendation;
  recommendationRationale: string;
};

export const PHASE_1_GQA_GRAPH_VERIFY_CHECK_IDS = [
  "module.graph-build-markers",
] as const;

export const PHASE_1_DOCS_FOOTER_VERIFY_CHECK_IDS = [
  "docs.footer-hover-focus-parity",
] as const;

export const PHASE_1_LEGACY_UX_VERIFY_CHECK_ID = "phase-1-legacy-ux" as const;

const PHASE_1_UX_FAILURE_PATTERNS: readonly RegExp[] = [
  /Phase 1 docs shell convergence verification failed[^\n]*/i,
  /Phase 1 home search entry convergence verification failed[^\n]*/i,
  /Phase 1 reader route content convergence verification failed[^\n]*/i,
  /Phase 1 tags navigation convergence verification failed[^\n]*/i,
  /Phase 1 route verification failed[^\n]*/i,
  /Phase 1 search verification failed[^\n]*/i,
  /Phase 1 \/search page verification failed[^\n]*/i,
  /Phase 1 header search dialog verification failed[^\n]*/i,
  /Phase 1 search keyboard shortcut verification failed[^\n]*/i,
];

function aggregateStatuses(
  statuses: readonly Phase1BlockerDomainStatus[],
): Phase1BlockerDomainStatus {
  if (statuses.some((status) => status === "fail")) {
    return "fail";
  }
  if (statuses.some((status) => status === "uncertain")) {
    return "uncertain";
  }
  return "pass";
}

function isRouteGateVerifyCheckId(checkId: string): boolean {
  return (
    !PHASE_1_GQA_GRAPH_VERIFY_CHECK_IDS.includes(
      checkId as (typeof PHASE_1_GQA_GRAPH_VERIFY_CHECK_IDS)[number],
    ) &&
    !PHASE_1_DOCS_FOOTER_VERIFY_CHECK_IDS.includes(
      checkId as (typeof PHASE_1_DOCS_FOOTER_VERIFY_CHECK_IDS)[number],
    )
  );
}

function summarizeVerifyRows(
  rows: readonly CustomerAskConvergenceRow[],
  checkIds: readonly string[],
): Phase1BlockerDomainSourceEvidence {
  const relevantRows = rows.filter((row) => checkIds.includes(row.checkId));
  const status = aggregateStatuses(relevantRows.map((row) => row.status));
  const failingRow = relevantRows.find((row) => row.status === "fail");
  const uncertainRow = relevantRows.find((row) => row.status === "uncertain");

  return {
    source: "make internal-verify-phase-1-ux",
    status,
    checkIdOrAssertion: relevantRows.map((row) => row.checkId).join(", "),
    reason:
      status === "fail"
        ? failingRow?.reason
        : status === "uncertain"
          ? uncertainRow?.reason
          : undefined,
  };
}

function summarizeRouteGateVerifyEvidence(
  rows: readonly CustomerAskConvergenceRow[],
  phase1UxFailure: Phase1UxFailureEvidence,
): Phase1BlockerDomainSourceEvidence {
  const routeGateRows = rows.filter((row) =>
    isRouteGateVerifyCheckId(row.checkId),
  );
  const rowStatus = aggregateStatuses(routeGateRows.map((row) => row.status));
  const failingRow = routeGateRows.find((row) => row.status === "fail");
  const uncertainRow = routeGateRows.find((row) => row.status === "uncertain");

  if (phase1UxFailure.failed) {
    return {
      source: "make internal-verify-phase-1-ux",
      status: "fail",
      checkIdOrAssertion: PHASE_1_LEGACY_UX_VERIFY_CHECK_ID,
      reason: phase1UxFailure.reason,
    };
  }

  if (rowStatus === "fail") {
    return {
      source: "make internal-verify-phase-1-ux",
      status: "fail",
      checkIdOrAssertion:
        failingRow?.checkId ?? PHASE_1_LEGACY_UX_VERIFY_CHECK_ID,
      reason: failingRow?.reason,
    };
  }

  if (rowStatus === "uncertain") {
    return {
      source: "make internal-verify-phase-1-ux",
      status: "uncertain",
      checkIdOrAssertion:
        uncertainRow?.checkId ??
        routeGateRows.map((row) => row.checkId).join(", "),
      reason: uncertainRow?.reason,
    };
  }

  return {
    source: "make internal-verify-phase-1-ux",
    status: "pass",
    checkIdOrAssertion:
      routeGateRows.map((row) => row.checkId).join(", ") ||
      PHASE_1_LEGACY_UX_VERIFY_CHECK_ID,
  };
}

function toCiSourceEvidence(
  evidence: Phase1CiBlockerDomainEvidence,
): Phase1BlockerDomainSourceEvidence {
  return {
    source: "make ci",
    status: evidence.status,
    checkIdOrAssertion: evidence.ciAssertionNames.join(", "),
    reason: evidence.reason,
  };
}

export type Phase1UxFailureEvidence = {
  failed: boolean;
  reason?: string;
};

/**
 * Detects legacy Phase 1 UX failure from captured `make internal-verify-phase-1-ux`
 * output without treating customer-ask row failures as UX failures.
 */
export function derivePhase1UxFailureFromVerifyOutput(
  output: string,
): Phase1UxFailureEvidence {
  if (output.includes(PHASE_1_UX_SUCCESS_MESSAGE)) {
    return { failed: false };
  }

  for (const pattern of PHASE_1_UX_FAILURE_PATTERNS) {
    const match = output.match(pattern);
    if (match?.[0]) {
      return { failed: true, reason: match[0].trim() };
    }
  }

  return { failed: false };
}

/**
 * Parses customer-ask convergence rows from verifier stdout. Lines outside the
 * structured report are ignored.
 */
export function parseCustomerAskConvergenceReport(
  output: string,
): CustomerAskConvergenceRow[] {
  const lines = output.split(/\r?\n/);
  const headerIndex = lines.findIndex(
    (line) => line.trim() === CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
  );
  if (headerIndex === -1) {
    return [];
  }

  const rows: CustomerAskConvergenceRow[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = parseCustomerAskConvergenceLine(trimmed);
    if (parsed) {
      rows.push(parsed);
    }
  }

  return rows;
}

export function parseCustomerAskConvergenceLine(
  line: string,
): CustomerAskConvergenceRow | undefined {
  const match = line.match(
    /^\[(PASS|FAIL|UNCERTAIN)\] ([^\s]+) — (.+) — checklistRow=(.+)$/,
  );
  if (!match) {
    return undefined;
  }

  const status = match[1].toLowerCase() as CustomerAskConvergenceRow["status"];
  const checkId = match[2];
  const checklistRow = match[4];
  const remainder = match[3];

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

  return {
    checkId,
    title,
    status,
    route,
    query,
    reason,
    checklistRow,
  };
}

/**
 * Combines CI blocker domain evidence and built-app verifier rows into one
 * planner-facing summary per batch-009 blocker domain.
 */
export function buildPhase1ConvergenceEvidenceSummary(input: {
  ciEvidence: readonly Phase1CiBlockerDomainEvidence[];
  customerAskRows: readonly CustomerAskConvergenceRow[];
  verifyOutput?: string;
  phase1UxFailure?: Phase1UxFailureEvidence;
}): Phase1ConvergenceEvidenceSummary {
  const phase1UxFailure =
    input.phase1UxFailure ??
    (input.verifyOutput
      ? derivePhase1UxFailureFromVerifyOutput(input.verifyOutput)
      : { failed: false });
  const domains = PHASE_1_BATCH_009_CI_DOMAIN_DEFINITIONS.map((definition) => {
    const ciRow = input.ciEvidence.find(
      (row) => row.domainId === definition.id,
    );
    if (!ciRow) {
      throw new Error(`Missing CI evidence for domain ${definition.id}`);
    }

    const ciSource = toCiSourceEvidence(ciRow);
    let verifySource: Phase1BlockerDomainSourceEvidence;
    if (definition.id === "gqa-module-graph-build-markers") {
      verifySource = summarizeVerifyRows(
        input.customerAskRows,
        PHASE_1_GQA_GRAPH_VERIFY_CHECK_IDS,
      );
    } else if (definition.id === "docs-footer-hover-focus-parity") {
      verifySource = summarizeVerifyRows(
        input.customerAskRows,
        PHASE_1_DOCS_FOOTER_VERIFY_CHECK_IDS,
      );
    } else {
      verifySource = summarizeRouteGateVerifyEvidence(
        input.customerAskRows,
        phase1UxFailure,
      );
    }

    return {
      domainId: definition.id,
      label: definition.label,
      checklistRow: definition.checklistRow,
      status: aggregateStatuses([ciSource.status, verifySource.status]),
      sources: [ciSource, verifySource],
    };
  });

  const recommendation = derivePhase1ConvergenceRecommendation(domains);
  return {
    domains,
    recommendation: recommendation.recommendation,
    recommendationRationale: recommendation.rationale,
  };
}

export function derivePhase1ConvergenceRecommendation(
  domains: readonly Phase1BlockerDomainSummary[],
): {
  recommendation: Phase1ConvergenceRecommendation;
  rationale: string;
} {
  const failedDomains = domains.filter((domain) => domain.status === "fail");
  if (failedDomains.length > 0) {
    const domainIds = failedDomains.map((domain) => domain.domainId).join(", ");
    return {
      recommendation: "queue-one-narrow-repair-batch",
      rationale: `Blocker domain(s) failed: ${domainIds}. Queue one narrow repair batch for the failing evidence before Phase 1 stop-and-wait.`,
    };
  }

  const uncertainDomains = domains.filter(
    (domain) => domain.status === "uncertain",
  );
  if (uncertainDomains.length > 0) {
    const domainIds = uncertainDomains
      .map((domain) => domain.domainId)
      .join(", ");
    return {
      recommendation: "stop-and-wait-for-phase-advancement",
      rationale: `All blocker domains passed; uncertain evidence in ${domainIds} is non-blocking. Stop and wait for customer Phase 1 advancement with manual follow-up notes for uncertain rows.`,
    };
  }

  return {
    recommendation: "stop-and-wait-for-phase-advancement",
    rationale:
      "All batch-009 blocker domains passed. Stop and wait for customer Phase 1 advancement.",
  };
}

function formatSourceEvidenceLine(
  evidence: Phase1BlockerDomainSourceEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `  [${status}] ${evidence.source} — ${evidence.checkIdOrAssertion}${reason}`;
}

export function formatPhase1BlockerDomainSummaryLine(
  summary: Phase1BlockerDomainSummary,
): string {
  const status = summary.status.toUpperCase();
  return `[${status}] ${summary.domainId} — ${summary.label} — checklistRow=${summary.checklistRow}`;
}

export function formatPhase1ConvergenceEvidenceSummary(
  summary: Phase1ConvergenceEvidenceSummary,
): string {
  const lines = [PHASE_1_CONVERGENCE_EVIDENCE_SUMMARY_HEADER];
  for (const domain of summary.domains) {
    lines.push(formatPhase1BlockerDomainSummaryLine(domain));
    for (const source of domain.sources) {
      lines.push(formatSourceEvidenceLine(source));
    }
  }
  lines.push(`Recommendation: ${summary.recommendation}`);
  lines.push(`Rationale: ${summary.recommendationRationale}`);
  return lines.join("\n");
}

export type PrintPhase1ConvergenceEvidenceSummaryOptions = {
  writeLine?: (line: string) => void;
};

export function printPhase1ConvergenceEvidenceSummary(
  summary: Phase1ConvergenceEvidenceSummary,
  options: PrintPhase1ConvergenceEvidenceSummaryOptions = {},
): void {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  for (const line of formatPhase1ConvergenceEvidenceSummary(summary).split(
    "\n",
  )) {
    writeLine(line);
  }
}
