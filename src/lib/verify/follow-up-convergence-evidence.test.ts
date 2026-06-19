import { describe, expect, test } from "bun:test";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  deriveVerifierCommandPathEvidence,
  VERIFIER_COMMAND_PATH_DOMAIN_ID,
} from "./phase-1-built-app-verifier-command-path";
import {
  buildPhase1FollowUpConvergenceEvidenceSummary,
  derivePhase1FollowUpConvergenceRecommendation,
  formatPhase1FollowUpConvergenceEvidenceSummary,
  getPhase1FollowUpConvergenceExitCode,
  PHASE_1_BATCH_011_FOLLOW_UP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-follow-up-convergence-evidence";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

const PASS_ROW: CustomerAskConvergenceRow = {
  checkId: "home.brevity",
  title: "Home page brevity",
  status: "pass",
  route: "/",
  checklistRow: "phase-1-follow-up-home-nav",
};

const UNCERTAIN_ROW: CustomerAskConvergenceRow = {
  checkId: "glossary.footer-hover",
  title: "Glossary footer previous/next label and sublabel hover styles pair",
  status: "uncertain",
  route: "/docs/glossary/token",
  reason: "footer nav present but hover pairing not observable in built HTML",
  checklistRow: "phase-1-glossary-page",
};

const FAIL_ROW: CustomerAskConvergenceRow = {
  checkId: "search.page.row-hover-coherence",
  title: "Search page first result row hover styling is coherent",
  status: "fail",
  route: "/search",
  query: "GQA",
  reason: "first result row missing group wrapper for row-level hover",
  checklistRow: "phase-1-search-surface",
};

function outputWithReport(rows: CustomerAskConvergenceRow[]): string {
  return `${formatCustomerAskConvergenceReport(rows)}\n`;
}

describe("buildPhase1FollowUpConvergenceEvidenceSummary", () => {
  test("includes verifier command-path domain and per-checkId customer-ask rows", () => {
    const verifyOutput = outputWithReport([PASS_ROW, UNCERTAIN_ROW]);
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput,
    });

    expect(summary.commandPath.domainId).toBe(VERIFIER_COMMAND_PATH_DOMAIN_ID);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.customerAsk.rows).toHaveLength(2);
    expect(summary.customerAsk.rows.map((row) => row.checkId)).toEqual([
      "home.brevity",
      "glossary.footer-hover",
    ]);
    expect(summary.customerAsk.status).toBe("uncertain");
  });

  test("recommends narrow repair when command-path fails", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(summary.commandPath.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain("verifier command-path");
  });

  test("recommends narrow repair when any customer-ask row fails", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });

    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain(
      "search.page.row-hover-coherence",
    );
  });

  test("recommends stop-and-wait when command-path and all rows pass", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain(
      "Stop and wait for customer Phase 1 advancement",
    );
  });

  test("recommends stop-and-wait when only uncertain evidence remains", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, UNCERTAIN_ROW]),
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain("glossary.footer-hover");
  });

  test("recommends stop-and-wait when command-path is uncertain", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
      verifyBaseUrl: "http://127.0.0.1:3456",
    });

    expect(summary.commandPath.status).toBe("uncertain");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain("verifier command-path");
  });
});

describe("derivePhase1FollowUpConvergenceRecommendation", () => {
  test("prioritizes command-path fail over passing customer-ask rows", () => {
    const commandPath = deriveVerifierCommandPathEvidence({
      output: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
    });
    const recommendation = derivePhase1FollowUpConvergenceRecommendation({
      commandPath,
      customerAskRows: [PASS_ROW],
    });

    expect(recommendation.recommendation).toBe("queue-one-narrow-repair-batch");
  });
});

describe("getPhase1FollowUpConvergenceExitCode", () => {
  test("returns 1 when command-path fails", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(getPhase1FollowUpConvergenceExitCode(summary)).toBe(1);
  });

  test("returns 1 when any customer-ask row fails", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });

    expect(getPhase1FollowUpConvergenceExitCode(summary)).toBe(1);
  });

  test("returns 0 when command-path passes and customer-ask rows are pass or uncertain only", () => {
    const passSummary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
    });
    const uncertainSummary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, UNCERTAIN_ROW]),
    });

    expect(getPhase1FollowUpConvergenceExitCode(passSummary)).toBe(0);
    expect(getPhase1FollowUpConvergenceExitCode(uncertainSummary)).toBe(0);
  });

  test("returns 0 when command-path is uncertain and no customer-ask row fails", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
      verifyBaseUrl: "http://127.0.0.1:3456",
    });

    expect(getPhase1FollowUpConvergenceExitCode(summary)).toBe(0);
  });
});

describe("formatPhase1FollowUpConvergenceEvidenceSummary", () => {
  test("includes header, domain rows, per-checkId sources, and recommendation", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });
    const report = formatPhase1FollowUpConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_011_FOLLOW_UP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("[PASS] verifier-command-path");
    expect(report).toContain("checklistRow=phase-1-built-app-verifier-harness");
    expect(report).toContain("[FAIL] customer-ask-convergence");
    expect(report).toContain(
      "checklistRow=phase-1-follow-up-customer-ask-convergence",
    );
    expect(report).toContain(
      "[PASS] make internal-verify-phase-1-ux — home.brevity",
    );
    expect(report).toContain(
      "[FAIL] make internal-verify-phase-1-ux — search.page.row-hover-coherence",
    );
    expect(report).toContain(FAIL_ROW.reason ?? "");
    expect(report).toContain("Recommendation: queue-one-narrow-repair-batch");
    expect(report).toContain("Rationale:");
  });
});
