import {
  BATCH_013_CUSTOMER_ASK_INVENTORY,
  orderCustomerAskRowsByBatch013Inventory,
} from "./batch-013-customer-ask-check-inventory";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildPhase1Batch013ConvergenceEvidenceSummary,
  PHASE_1_BATCH_013_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  type Phase1Batch013ConvergenceEvidenceSummary,
  type Phase1Batch013ConvergenceRecommendation,
} from "./phase-1-batch-013-convergence-evidence";

export const BATCH_013_CLOSURE_READY_RECOMMENDATIONS = [
  "stop-and-wait-for-phase-advancement",
] as const satisfies readonly Phase1Batch013ConvergenceRecommendation[];

export type Batch013ClosureReadyRecommendation =
  (typeof BATCH_013_CLOSURE_READY_RECOMMENDATIONS)[number];

export const BATCH_013_PRE_REPAIR_RECOMMENDATIONS = [
  "queue-one-narrow-repair-batch",
] as const satisfies readonly Phase1Batch013ConvergenceRecommendation[];

export type Batch013PreRepairRecommendation =
  (typeof BATCH_013_PRE_REPAIR_RECOMMENDATIONS)[number];

/**
 * Asserts batch-013 customer-ask rows cover the reopened inventory with only
 * pass or documented uncertain statuses (no fail rows).
 */
export function assertBatch013CustomerAskRowsPassOrUncertain(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const ordered = orderCustomerAskRowsByBatch013Inventory(rows);
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

function assertBatch013InventoryChecklistRows(
  rows: readonly CustomerAskConvergenceRow[],
): void {
  for (const entry of BATCH_013_CUSTOMER_ASK_INVENTORY) {
    const matchingRows = rows.filter(
      (row) =>
        row.checkId === entry.checkId &&
        row.route === entry.route &&
        (entry.query === undefined
          ? row.query === undefined
          : row.query === entry.query),
    );
    if (matchingRows.length === 0) {
      throw new Error(
        `Expected customer-ask convergence row for inventory checkId ${entry.checkId} route=${entry.route}`,
      );
    }
    if (!matchingRows.every((row) => row.checklistRow === entry.checklistRow)) {
      throw new Error(
        `Expected checklistRow=${entry.checklistRow} for inventory checkId ${entry.checkId} route=${entry.route}`,
      );
    }
  }
}

/**
 * Asserts captured batch-013 convergence output is strong enough to stop-and-wait
 * for Phase 1 advancement after batch-013 repairs land.
 */
export function assertBatch013ConvergenceClosureReady(
  output: string,
): Phase1Batch013ConvergenceEvidenceSummary {
  if (!output.includes(PHASE_1_BATCH_013_CONVERGENCE_EVIDENCE_SUMMARY_HEADER)) {
    throw new Error(
      "Expected Phase 1 batch-013 convergence evidence summary in output",
    );
  }

  const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
    verifyOutput: output,
  });

  if (summary.commandPath.status !== "pass") {
    throw new Error(
      `Expected verifier command-path pass for closure readiness, got ${summary.commandPath.status}${summary.commandPath.reason ? `: ${summary.commandPath.reason}` : ""}`,
    );
  }

  assertBatch013CustomerAskRowsPassOrUncertain(summary.customerAsk.rows);
  assertBatch013InventoryChecklistRows(summary.customerAsk.rows);

  if (
    !BATCH_013_CLOSURE_READY_RECOMMENDATIONS.includes(
      summary.recommendation as Batch013ClosureReadyRecommendation,
    )
  ) {
    throw new Error(
      `Expected closure-ready recommendation (${BATCH_013_CLOSURE_READY_RECOMMENDATIONS.join(" or ")}), got ${summary.recommendation}`,
    );
  }

  return summary;
}

/**
 * Asserts captured batch-013 convergence output still reflects pre-repair failing
 * evidence planners should route to one narrow repair batch.
 */
export function assertBatch013ConvergencePreRepairEvidence(
  output: string,
): Phase1Batch013ConvergenceEvidenceSummary {
  if (!output.includes(PHASE_1_BATCH_013_CONVERGENCE_EVIDENCE_SUMMARY_HEADER)) {
    throw new Error(
      "Expected Phase 1 batch-013 convergence evidence summary in output",
    );
  }

  const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
    verifyOutput: output,
  });

  const failingRows = summary.customerAsk.rows.filter(
    (row) => row.status === "fail",
  );
  if (failingRows.length === 0) {
    throw new Error(
      "Expected at least one failing batch-013 customer-ask row for pre-repair evidence",
    );
  }

  for (const row of failingRows) {
    if (!row.reason?.trim()) {
      throw new Error(
        `Expected concrete failure reason for pre-repair checkId ${row.checkId}`,
      );
    }
  }

  if (
    !BATCH_013_PRE_REPAIR_RECOMMENDATIONS.includes(
      summary.recommendation as Batch013PreRepairRecommendation,
    )
  ) {
    throw new Error(
      `Expected pre-repair recommendation (${BATCH_013_PRE_REPAIR_RECOMMENDATIONS.join(" or ")}), got ${summary.recommendation}`,
    );
  }

  return summary;
}

/**
 * Asserts a command-path failure summary includes a specific lifecycle reason
 * planners can use to scope one bounded repair.
 */
export function assertBatch013CommandPathFailureIsActionable(
  summary: Phase1Batch013ConvergenceEvidenceSummary,
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
