import { describe, expect, test } from "bun:test";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildPhase1BuiltAppConvergenceEvidenceSummary,
  derivePhase1BuiltAppConvergenceRecommendation,
  formatPhase1BuiltAppConvergenceEvidenceSummary,
  PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-built-app-convergence-evidence";
import {
  deriveVerifierCommandPathEvidence,
  VERIFIER_COMMAND_PATH_DOMAIN_ID,
} from "./phase-1-built-app-verifier-command-path";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

const PASS_ROW: CustomerAskConvergenceRow = {
  checkId: "home.header-search-entry",
  title: "Home exposes header-only search entry",
  status: "pass",
  route: "/",
  checklistRow: "phase-1-home-header-polish",
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
  checkId: "docs.footer-hover-focus-parity",
  title:
    "Docs footer previous/next sublabels inherit accent foreground on hover and focus-visible",
  status: "fail",
  route: "/docs/glossary/token",
  reason:
    "bundled app CSS missing footer sublabel hover/focus inherit rule pairing",
  checklistRow: "phase-1-docs-footer",
};

function outputWithReport(rows: CustomerAskConvergenceRow[]): string {
  return `${formatCustomerAskConvergenceReport(rows)}\n`;
}

describe("buildPhase1BuiltAppConvergenceEvidenceSummary", () => {
  test("includes verifier command-path domain and per-checkId customer-ask rows", () => {
    const verifyOutput = outputWithReport([PASS_ROW, UNCERTAIN_ROW]);
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput,
    });

    expect(summary.commandPath.domainId).toBe(VERIFIER_COMMAND_PATH_DOMAIN_ID);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.customerAsk.rows).toHaveLength(2);
    expect(summary.customerAsk.rows.map((row) => row.checkId)).toEqual([
      "home.header-search-entry",
      "glossary.footer-hover",
    ]);
    expect(summary.customerAsk.status).toBe("uncertain");
  });

  test("recommends narrow repair when command-path fails", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(summary.commandPath.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain("verifier command-path");
  });

  test("recommends narrow repair when any customer-ask row fails", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });

    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain(
      "docs.footer-hover-focus-parity",
    );
  });

  test("recommends close-verifier-harness when command-path and all rows pass", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
    });

    expect(summary.recommendation).toBe("close-verifier-harness-regression");
    expect(summary.recommendationRationale).toContain(
      "Close the batch-010 verifier-harness regression",
    );
  });

  test("recommends stop-and-wait when only uncertain evidence remains", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, UNCERTAIN_ROW]),
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain("glossary.footer-hover");
  });

  test("recommends stop-and-wait when command-path is uncertain", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
      verifyBaseUrl: "http://127.0.0.1:3456",
    });

    expect(summary.commandPath.status).toBe("uncertain");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain("verifier command-path");
  });
});

describe("derivePhase1BuiltAppConvergenceRecommendation", () => {
  test("prioritizes command-path fail over passing customer-ask rows", () => {
    const commandPath = deriveVerifierCommandPathEvidence({
      output: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
    });
    const recommendation = derivePhase1BuiltAppConvergenceRecommendation({
      commandPath,
      customerAskRows: [PASS_ROW],
    });

    expect(recommendation.recommendation).toBe("queue-one-narrow-repair-batch");
  });
});

describe("formatPhase1BuiltAppConvergenceEvidenceSummary", () => {
  test("includes header, domain rows, per-checkId sources, and recommendation", () => {
    const summary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
    });
    const report = formatPhase1BuiltAppConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_010_BUILT_APP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("[PASS] verifier-command-path");
    expect(report).toContain("checklistRow=phase-1-built-app-verifier-harness");
    expect(report).toContain("[FAIL] customer-ask-convergence");
    expect(report).toContain("checklistRow=phase-1-customer-ask-convergence");
    expect(report).toContain(
      "[PASS] make verify-phase-1-ux — home.header-search-entry",
    );
    expect(report).toContain(
      "[FAIL] make verify-phase-1-ux — docs.footer-hover-focus-parity",
    );
    expect(report).toContain(FAIL_ROW.reason ?? "");
    expect(report).toContain("Recommendation: queue-one-narrow-repair-batch");
    expect(report).toContain("Rationale:");
  });
});
