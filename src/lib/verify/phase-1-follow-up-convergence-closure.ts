import {
  BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY,
  buildBatch011FollowUpCustomerAskReportSlots,
  orderCustomerAskRowsByBatch011Inventory,
} from "./batch-011-follow-up-customer-ask-check-inventory";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import { parseCustomerAskConvergenceReport } from "./phase-1-convergence-evidence";
import {
  buildPhase1FollowUpConvergenceEvidenceSummary,
  PHASE_1_BATCH_011_FOLLOW_UP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  type Phase1FollowUpConvergenceEvidenceSummary,
  type Phase1FollowUpConvergenceRecommendation,
} from "./phase-1-follow-up-convergence-evidence";

export const BATCH_011_FOLLOW_UP_CLOSURE_READY_RECOMMENDATIONS = [
  "stop-and-wait-for-phase-advancement",
] as const satisfies readonly Phase1FollowUpConvergenceRecommendation[];

export type Batch011FollowUpClosureReadyRecommendation =
  (typeof BATCH_011_FOLLOW_UP_CLOSURE_READY_RECOMMENDATIONS)[number];

const NON_CUSTOMER_ASK_REPORT_CHECK_IDS = new Set([
  "verifier-command-path",
  "customer-ask-convergence",
]);

function rowMatchesBatch011FollowUpSlot(
  row: CustomerAskConvergenceRow,
  slot: ReturnType<typeof buildBatch011FollowUpCustomerAskReportSlots>[number],
): boolean {
  if (row.checkId !== slot.checkId) {
    return false;
  }

  if (slot.query === undefined) {
    return row.query === undefined;
  }

  return row.query === slot.query;
}

function parseBatch011FollowUpCustomerAskRows(
  output: string,
): CustomerAskConvergenceRow[] {
  const batch011Slots = buildBatch011FollowUpCustomerAskReportSlots();
  const pool = parseCustomerAskConvergenceReport(output).filter(
    (row) => !NON_CUSTOMER_ASK_REPORT_CHECK_IDS.has(row.checkId),
  );
  const ordered: CustomerAskConvergenceRow[] = [];

  for (const slot of batch011Slots) {
    const index = pool.findIndex((row) =>
      rowMatchesBatch011FollowUpSlot(row, slot),
    );
    if (index === -1) {
      continue;
    }
    ordered.push(pool.splice(index, 1)[0]);
  }

  return ordered;
}

/**
 * Asserts customer-ask rows cover the full batch-011 inventory with only pass
 * or documented uncertain statuses (no fail rows).
 */
export function assertBatch011FollowUpCustomerAskRowsPassOrUncertain(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const ordered = orderCustomerAskRowsByBatch011Inventory(rows);
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
 * Asserts captured batch-011 follow-up convergence output is strong enough to
 * stop-and-wait for Phase 1 advancement after follow-up repairs land.
 */
export function assertBatch011FollowUpConvergenceClosureReady(
  output: string,
): Phase1FollowUpConvergenceEvidenceSummary {
  if (
    !output.includes(
      PHASE_1_BATCH_011_FOLLOW_UP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    )
  ) {
    throw new Error(
      "Expected Phase 1 batch-011 follow-up convergence evidence summary in output",
    );
  }

  const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
    verifyOutput: output,
  });

  if (summary.commandPath.status !== "pass") {
    throw new Error(
      `Expected verifier command-path pass for closure readiness, got ${summary.commandPath.status}${summary.commandPath.reason ? `: ${summary.commandPath.reason}` : ""}`,
    );
  }

  const parsedRows = parseBatch011FollowUpCustomerAskRows(output);
  const expectedBatch011Slots = buildBatch011FollowUpCustomerAskReportSlots();
  if (parsedRows.length !== expectedBatch011Slots.length) {
    orderCustomerAskRowsByBatch011Inventory(parsedRows);
  }

  for (const {
    checkId,
    checklistRow,
  } of BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY) {
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
    !BATCH_011_FOLLOW_UP_CLOSURE_READY_RECOMMENDATIONS.includes(
      summary.recommendation as Batch011FollowUpClosureReadyRecommendation,
    )
  ) {
    throw new Error(
      `Expected closure-ready recommendation (${BATCH_011_FOLLOW_UP_CLOSURE_READY_RECOMMENDATIONS.join(" or ")}), got ${summary.recommendation}`,
    );
  }

  return summary;
}

/**
 * Asserts a command-path failure summary includes a specific lifecycle reason
 * planners can use to scope one bounded repair.
 */
export function assertBatch011FollowUpCommandPathFailureIsActionable(
  summary: Phase1FollowUpConvergenceEvidenceSummary,
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
