import { describe, expect, test } from "bun:test";
import { BATCH_008_CUSTOMER_ASK_CHECK_IDS } from "./batch-008-customer-ask-check-inventory";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  assertBatch010BuiltAppConvergenceClosureReady,
  assertBatch010CommandPathFailureIsActionable,
} from "./phase-1-built-app-convergence-closure";
import {
  buildPhase1BuiltAppConvergenceEvidenceSummary,
  formatPhase1BuiltAppConvergenceEvidenceSummary,
  PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-built-app-convergence-evidence";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

function inventoryPassRow(
  checkId: string,
  checklistRow: string,
): CustomerAskConvergenceRow {
  return {
    checkId,
    title: `${checkId} stub title`,
    status: "pass",
    route: "/",
    checklistRow,
  };
}

function fullInventoryPassReport(): string {
  const rows: CustomerAskConvergenceRow[] = [];
  for (const checkId of BATCH_008_CUSTOMER_ASK_CHECK_IDS) {
    const checklistRow = checkId.startsWith("home.")
      ? "phase-1-home-header-polish"
      : checkId.startsWith("tags.")
        ? "phase-1-tag-list-styling"
        : checkId.startsWith("search.")
          ? "phase-1-search-surface"
          : checkId.startsWith("glossary.")
            ? "phase-1-glossary-page"
            : checkId.startsWith("docs.")
              ? "phase-1-docs-footer"
              : "phase-1-module-page";
    rows.push(inventoryPassRow(checkId, checklistRow));
  }

  return formatCustomerAskConvergenceReport(rows);
}

function outputWithSummary(verifyOutput: string): string {
  const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
    verifyOutput,
  });
  return `${verifyOutput}\n${formatPhase1BuiltAppConvergenceEvidenceSummary(summary)}`;
}

describe("assertBatch010BuiltAppConvergenceClosureReady", () => {
  test("accepts command-path pass with full inventory and close-verifier recommendation", () => {
    const output = outputWithSummary(fullInventoryPassReport());

    const summary = assertBatch010BuiltAppConvergenceClosureReady(output);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("close-verifier-harness-regression");
  });

  test("accepts uncertain customer-ask rows with stop-and-wait recommendation", () => {
    const passReport = fullInventoryPassReport();
    const uncertainReport = passReport.replace(
      "[PASS] glossary.footer-hover",
      "[UNCERTAIN] glossary.footer-hover — Glossary footer hover — footer nav present but hover pairing not observable in built HTML",
    );
    const output = outputWithSummary(uncertainReport);

    const summary = assertBatch010BuiltAppConvergenceClosureReady(output);
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
  });

  test("rejects missing evidence summary header", () => {
    expect(() =>
      assertBatch010BuiltAppConvergenceClosureReady(fullInventoryPassReport()),
    ).toThrow(/batch-010 built-app convergence evidence summary/);
  });

  test("rejects command-path fail output", () => {
    const output = outputWithSummary(`${NEXT_BUILD_REQUIRED_MESSAGE}\n`);

    expect(() => assertBatch010BuiltAppConvergenceClosureReady(output)).toThrow(
      /command-path pass/,
    );
  });

  test("rejects customer-ask fail rows", () => {
    const failReport = fullInventoryPassReport().replace(
      "[PASS] home.header-search-entry",
      "[FAIL] home.header-search-entry — Home exposes header-only search entry — missing header search trigger — checklistRow=phase-1-home-header-polish",
    );
    const output = outputWithSummary(failReport);

    expect(() => assertBatch010BuiltAppConvergenceClosureReady(output)).toThrow(
      /no failing customer-ask rows/,
    );
  });
});

describe("assertBatch010CommandPathFailureIsActionable", () => {
  test("requires specific reason and narrow-repair recommendation", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(() =>
      assertBatch010CommandPathFailureIsActionable(summary),
    ).not.toThrow();
    expect(summary.commandPath.reason).toBe(NEXT_BUILD_REQUIRED_MESSAGE);
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
  });

  test("ignores passing command-path summaries", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: fullInventoryPassReport(),
    });

    expect(() =>
      assertBatch010CommandPathFailureIsActionable(summary),
    ).not.toThrow();
  });
});

describe("batch-010 closure summary contract", () => {
  test("printed summary header matches planner doc", () => {
    expect(
      PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    ).toBe("Phase 1 batch-010 built-app convergence evidence summary");
  });
});
