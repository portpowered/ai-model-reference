import {
  BATCH_012_CUSTOMER_ASK_INVENTORY,
  orderCustomerAskRowsByBatch012Inventory,
} from "./batch-012-customer-ask-check-inventory";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildPhase1Batch012ConvergenceEvidenceSummary,
  PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  type Phase1Batch012ConvergenceEvidenceSummary,
  type Phase1Batch012ConvergenceRecommendation,
} from "./phase-1-batch-012-convergence-evidence";
import { parseCustomerAskConvergenceReport } from "./phase-1-convergence-evidence";
import { orderCustomerAskRowsByPhase1CustomerAskInventory } from "./phase-1-customer-ask-check-inventory";

export const BATCH_012_CLOSURE_READY_RECOMMENDATIONS = [
  "stop-and-wait-for-phase-advancement",
] as const satisfies readonly Phase1Batch012ConvergenceRecommendation[];

export type Batch012ClosureReadyRecommendation =
  (typeof BATCH_012_CLOSURE_READY_RECOMMENDATIONS)[number];

const NON_CUSTOMER_ASK_REPORT_CHECK_IDS = new Set([
  "verifier-command-path",
  "customer-ask-convergence",
]);

function parseBatch012CustomerAskRows(
  output: string,
): CustomerAskConvergenceRow[] {
  return parseCustomerAskConvergenceReport(output).filter(
    (row) => !NON_CUSTOMER_ASK_REPORT_CHECK_IDS.has(row.checkId),
  );
}

/**
 * Asserts customer-ask rows cover the full batch-012 inventory with only pass
 * or documented uncertain statuses (no fail rows).
 */
export function assertBatch012CustomerAskRowsPassOrUncertain(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const ordered = orderCustomerAskRowsByBatch012Inventory(rows);
  const failingRows = ordered.filter((row) => row.status === "fail");
  if (failingRows.length > 0) {
    throw new Error(
      `Expected no failing customer-ask rows for post-repair closure; failed checkId(s): ${failingRows.map((row) => row.checkId).join(", ")}`,
    );
  }

  const undocumentedUncertain = ordered.filter(
    (row) => row.status === "uncertain" && !row.reason?.trim(),
  );
  if (undocumentedUncertain.length > 0) {
    throw new Error(
      `Expected human-readable reasons on uncertain rows: ${undocumentedUncertain.map((row) => row.checkId).join(", ")}`,
    );
  }

  return ordered;
}

/**
 * Asserts customer-ask rows cover the expanded Phase 1 inventory with only pass
 * or documented uncertain statuses (no fail rows).
 */
export function assertPhase1CustomerAskRowsPassOrUncertain(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const ordered = orderCustomerAskRowsByPhase1CustomerAskInventory(rows);
  const failingRows = ordered.filter((row) => row.status === "fail");
  if (failingRows.length > 0) {
    throw new Error(
      `Expected no failing customer-ask rows for post-repair closure; failed checkId(s): ${failingRows.map((row) => row.checkId).join(", ")}`,
    );
  }

  const undocumentedUncertain = ordered.filter(
    (row) => row.status === "uncertain" && !row.reason?.trim(),
  );
  if (undocumentedUncertain.length > 0) {
    throw new Error(
      `Expected human-readable reasons on uncertain rows: ${undocumentedUncertain.map((row) => row.checkId).join(", ")}`,
    );
  }

  return ordered;
}

/**
 * Asserts captured batch-012 convergence output is strong enough to stop-and-wait
 * for Phase 1 advancement after batch-012 repairs land.
 */
export function assertBatch012ConvergenceClosureReady(
  output: string,
): Phase1Batch012ConvergenceEvidenceSummary {
  if (!output.includes(PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER)) {
    throw new Error(
      "Expected Phase 1 batch-012 convergence evidence summary in output",
    );
  }

  const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
    verifyOutput: output,
  });

  if (summary.commandPath.status !== "pass") {
    throw new Error(
      `Expected verifier command-path pass for closure readiness, got ${summary.commandPath.status}${summary.commandPath.reason ? `: ${summary.commandPath.reason}` : ""}`,
    );
  }

  const parsedRows = parseBatch012CustomerAskRows(output);
  orderCustomerAskRowsByBatch012Inventory(parsedRows);

  for (const { checkId, checklistRow } of BATCH_012_CUSTOMER_ASK_INVENTORY) {
    const matchingRows = parsedRows.filter((row) => row.checkId === checkId);
    if (matchingRows.length === 0) {
      throw new Error(
        `Expected customer-ask convergence row for inventory checkId ${checkId}`,
      );
    }
    if (!matchingRows.every((row) => row.checklistRow === checklistRow)) {
      throw new Error(
        `Expected checklistRow=${checklistRow} for inventory checkId ${checkId}`,
      );
    }
  }

  const failingRows = parsedRows.filter((row) => row.status === "fail");
  if (failingRows.length > 0) {
    throw new Error(
      `Expected no failing customer-ask rows for closure readiness; failed checkId(s): ${failingRows.map((row) => row.checkId).join(", ")}`,
    );
  }

  if (
    !BATCH_012_CLOSURE_READY_RECOMMENDATIONS.includes(
      summary.recommendation as Batch012ClosureReadyRecommendation,
    )
  ) {
    throw new Error(
      `Expected closure-ready recommendation (${BATCH_012_CLOSURE_READY_RECOMMENDATIONS.join(" or ")}), got ${summary.recommendation}`,
    );
  }

  return summary;
}

/**
 * Asserts a command-path failure summary includes a specific lifecycle reason
 * planners can use to scope one bounded repair.
 */
export function assertBatch012CommandPathFailureIsActionable(
  summary: Phase1Batch012ConvergenceEvidenceSummary,
): void {
  if (summary.commandPath.status !== "fail") {
    return;
  }

  const reason = summary.commandPath.reason?.trim();
  if (!reason) {
    throw new Error(
      "Expected specific verifier command-path failure reason for actionable repair scoping",
    );
  }

  if (summary.recommendation !== "queue-one-narrow-repair-batch") {
    throw new Error(
      `Expected queue-one-narrow-repair-batch recommendation for command-path fail, got ${summary.recommendation}`,
    );
  }

  if (!summary.recommendationRationale.includes(reason)) {
    throw new Error(
      "Expected recommendation rationale to include the command-path failure reason",
    );
  }
}
