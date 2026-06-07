import { describe, expect, test } from "bun:test";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildPhase1Batch012ConvergenceEvidenceSummary,
  derivePhase1Batch012ConvergenceRecommendation,
  formatPhase1Batch012ConvergenceEvidenceSummary,
  getPhase1Batch012ConvergenceExitCode,
  PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-batch-012-convergence-evidence";
import {
  deriveVerifierCommandPathEvidence,
  VERIFIER_COMMAND_PATH_DOMAIN_ID,
} from "./phase-1-built-app-verifier-command-path";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

const PASS_ROW: CustomerAskConvergenceRow = {
  checkId: "home.mobile-hamburger-menu",
  title: "Home header exposes mobile hamburger menu affordance",
  status: "pass",
  route: "/",
  checklistRow: "phase-1-header-bar",
};

const UNCERTAIN_ROW: CustomerAskConvergenceRow = {
  checkId: "module.graph-theme-readability",
  title: "GQA module graph node colors are readable",
  status: "uncertain",
  route: "/docs/modules/grouped-query-attention",
  reason:
    "theme markers present but contrast not provable from static HTML; see factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md",
  checklistRow: "phase-1-module-page",
};

const FAIL_ROW: CustomerAskConvergenceRow = {
  checkId: "glossary.no-rendered-opening-summary",
  title: "Glossary pages omit rendered openingSummary block",
  status: "fail",
  route: "/docs/glossary/token",
  reason: "glossary-opening marker still rendered in built HTML",
  checklistRow: "phase-1-glossary-page",
};

function outputWithReport(rows: CustomerAskConvergenceRow[]): string {
  return `${formatCustomerAskConvergenceReport(rows)}\n`;
}

describe("buildPhase1Batch012ConvergenceEvidenceSummary", () => {
  test("includes verifier command-path domain and per-checkId customer-ask rows", () => {
    const verifyOutput = outputWithReport([PASS_ROW, UNCERTAIN_ROW]);
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput,
    });

    expect(summary.commandPath.domainId).toBe(VERIFIER_COMMAND_PATH_DOMAIN_ID);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.customerAsk.rows).toHaveLength(2);
    expect(summary.customerAsk.rows.map((row) => row.checkId)).toEqual([
      "home.mobile-hamburger-menu",
      "module.graph-theme-readability",
    ]);
    expect(summary.customerAsk.status).toBe("uncertain");
  });

  test("recommends narrow repair when command-path fails", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(summary.commandPath.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain("verifier command-path");
  });

  test("recommends narrow repair when any customer-ask row fails", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });

    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain(
      "glossary.no-rendered-opening-summary",
    );
  });

  test("recommends stop-and-wait when command-path and all rows pass", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain(
      "Stop and wait for customer Phase 1 advancement",
    );
  });

  test("recommends stop-and-wait when only uncertain evidence remains", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, UNCERTAIN_ROW]),
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain(
      "module.graph-theme-readability",
    );
  });
});

describe("derivePhase1Batch012ConvergenceRecommendation", () => {
  test("prioritizes command-path fail over passing customer-ask rows", () => {
    const commandPath = deriveVerifierCommandPathEvidence({
      output: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
    });
    const recommendation = derivePhase1Batch012ConvergenceRecommendation({
      commandPath,
      customerAskRows: [PASS_ROW],
    });

    expect(recommendation.recommendation).toBe("queue-one-narrow-repair-batch");
  });
});

describe("getPhase1Batch012ConvergenceExitCode", () => {
  test("returns 1 when command-path fails", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(getPhase1Batch012ConvergenceExitCode(summary)).toBe(1);
  });

  test("returns 1 when any customer-ask row fails", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });

    expect(getPhase1Batch012ConvergenceExitCode(summary)).toBe(1);
  });

  test("returns 0 when command-path passes and customer-ask rows are pass or uncertain only", () => {
    const passSummary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
    });
    const uncertainSummary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, UNCERTAIN_ROW]),
    });

    expect(getPhase1Batch012ConvergenceExitCode(passSummary)).toBe(0);
    expect(getPhase1Batch012ConvergenceExitCode(uncertainSummary)).toBe(0);
  });
});

describe("formatPhase1Batch012ConvergenceEvidenceSummary", () => {
  test("includes header, domain rows, per-checkId sources, and recommendation", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });
    const report = formatPhase1Batch012ConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("[PASS] verifier-command-path");
    expect(report).toContain("checklistRow=phase-1-built-app-verifier-harness");
    expect(report).toContain("[FAIL] customer-ask-convergence");
    expect(report).toContain(
      "checklistRow=phase-1-batch-012-customer-ask-convergence",
    );
    expect(report).toContain(
      "[PASS] make verify-phase-1-ux — home.mobile-hamburger-menu",
    );
    expect(report).toContain(
      "[FAIL] make verify-phase-1-ux — glossary.no-rendered-opening-summary",
    );
    expect(report).toContain(FAIL_ROW.reason ?? "");
    expect(report).toContain("Recommendation: queue-one-narrow-repair-batch");
    expect(report).toContain("Rationale:");
  });
});
