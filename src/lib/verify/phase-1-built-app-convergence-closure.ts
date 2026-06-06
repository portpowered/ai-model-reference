import { BATCH_008_CUSTOMER_ASK_INVENTORY } from "./batch-008-customer-ask-check-inventory";
import {
  buildPhase1BuiltAppConvergenceEvidenceSummary,
  PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  type Phase1BuiltAppConvergenceEvidenceSummary,
  type Phase1BuiltAppConvergenceRecommendation,
} from "./phase-1-built-app-convergence-evidence";
import { parseCustomerAskConvergenceReport } from "./phase-1-convergence-evidence";

export const BATCH_010_CLOSURE_READY_RECOMMENDATIONS = [
  "close-verifier-harness-regression",
  "stop-and-wait-for-phase-advancement",
] as const satisfies readonly Phase1BuiltAppConvergenceRecommendation[];

export type Batch010ClosureReadyRecommendation =
  (typeof BATCH_010_CLOSURE_READY_RECOMMENDATIONS)[number];

/**
 * Asserts captured built-app convergence output is strong enough to close the
 * verifier-harness regression or stop-and-wait for Phase 1 advancement.
 */
export function assertBatch010BuiltAppConvergenceClosureReady(
  output: string,
): Phase1BuiltAppConvergenceEvidenceSummary {
  if (
    !output.includes(
      PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    )
  ) {
    throw new Error(
      "Expected Phase 1 batch-010 built-app convergence evidence summary in output",
    );
  }

  const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
    verifyOutput: output,
  });

  if (summary.commandPath.status !== "pass") {
    throw new Error(
      `Expected verifier command-path pass for closure readiness, got ${summary.commandPath.status}${summary.commandPath.reason ? `: ${summary.commandPath.reason}` : ""}`,
    );
  }

  const parsedRows = parseCustomerAskConvergenceReport(output);
  for (const { checkId, checklistRow } of BATCH_008_CUSTOMER_ASK_INVENTORY) {
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
    !BATCH_010_CLOSURE_READY_RECOMMENDATIONS.includes(
      summary.recommendation as Batch010ClosureReadyRecommendation,
    )
  ) {
    throw new Error(
      `Expected closure-ready recommendation (${BATCH_010_CLOSURE_READY_RECOMMENDATIONS.join(" or ")}), got ${summary.recommendation}`,
    );
  }

  return summary;
}

/**
 * Asserts a command-path failure summary includes a specific lifecycle reason
 * planners can use to scope one bounded repair.
 */
export function assertBatch010CommandPathFailureIsActionable(
  summary: Phase1BuiltAppConvergenceEvidenceSummary,
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
