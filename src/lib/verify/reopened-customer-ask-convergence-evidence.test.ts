import { describe, expect, test } from "bun:test";
import { BATCH_013_GLOSSARY_CHECKS } from "./batch-013-glossary-checks";
import { BATCH_013_GQA_MODULE_CHECKS } from "./batch-013-gqa-module-checks";
import { BATCH_013_ROUTE_CHECKS } from "./batch-013-route-checks";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildPhase1Batch013ConvergenceEvidenceSummary,
  derivePhase1Batch013ConvergenceRecommendation,
  formatPhase1Batch013ConvergenceEvidenceSummary,
  getPhase1Batch013ConvergenceExitCode,
  PHASE_1_BATCH_013_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-batch-013-convergence-evidence";
import {
  deriveVerifierCommandPathEvidence,
  VERIFIER_COMMAND_PATH_DOMAIN_ID,
} from "./phase-1-built-app-verifier-command-path";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

const PASS_ROW: CustomerAskConvergenceRow = {
  checkId: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
  title: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.title,
  status: "pass",
  route: "/docs/glossary/token",
  checklistRow: "phase-1-glossary-page",
};

const UNCERTAIN_ROW: CustomerAskConvergenceRow = {
  checkId: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
  title: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.title,
  status: "uncertain",
  route: "/docs/modules/grouped-query-attention",
  reason:
    "theme markers present but contrast not provable from static HTML; see factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md",
  checklistRow: "phase-1-module-page",
};

const FAIL_ROW: CustomerAskConvergenceRow = {
  checkId: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
  title: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.title,
  status: "fail",
  route: "/docs/glossary/embedding",
  reason: "embedding description paragraph missing resolved inline links",
  checklistRow: "phase-1-glossary-page",
};

const EXTRA_ROW: CustomerAskConvergenceRow = {
  checkId: "home.mobile-hamburger-menu",
  title: "Home header exposes mobile hamburger menu affordance",
  status: "pass",
  route: "/",
  checklistRow: "phase-1-header-bar",
};

const VECTOR_ROUTE_ROW: CustomerAskConvergenceRow = {
  checkId: BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
  title: BATCH_013_ROUTE_CHECKS.vectorRoute.title,
  status: "pass",
  route: "/docs/glossary/vector",
  checklistRow: "phase-1-glossary-page",
};

function outputWithReport(rows: CustomerAskConvergenceRow[]): string {
  return `${formatCustomerAskConvergenceReport(rows)}\n`;
}

describe("buildPhase1Batch013ConvergenceEvidenceSummary", () => {
  test("includes verifier command-path domain and batch-013 per-checkId rows", () => {
    const verifyOutput = outputWithReport([
      EXTRA_ROW,
      PASS_ROW,
      UNCERTAIN_ROW,
      VECTOR_ROUTE_ROW,
    ]);
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput,
      customerAskRows: [PASS_ROW, UNCERTAIN_ROW, VECTOR_ROUTE_ROW],
    });

    expect(summary.commandPath.domainId).toBe(VERIFIER_COMMAND_PATH_DOMAIN_ID);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.customerAsk.rows).toHaveLength(3);
    expect(summary.customerAsk.rows.map((row) => row.checkId)).toEqual([
      PASS_ROW.checkId,
      UNCERTAIN_ROW.checkId,
      VECTOR_ROUTE_ROW.checkId,
    ]);
    expect(summary.customerAsk.status).toBe("uncertain");
  });

  test("extracts only batch-013 inventory rows from a full customer-ask report", () => {
    const verifyOutput = outputWithReport([EXTRA_ROW, PASS_ROW, UNCERTAIN_ROW]);
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput,
    });

    expect(summary.customerAsk.rows).toHaveLength(13);
    expect(
      summary.customerAsk.rows.every(
        (row) => row.checkId !== EXTRA_ROW.checkId,
      ),
    ).toBe(true);
    expect(
      summary.customerAsk.rows.some(
        (row) =>
          row.checkId === PASS_ROW.checkId &&
          row.route === PASS_ROW.route &&
          row.status === "pass",
      ),
    ).toBe(true);
    expect(
      summary.customerAsk.rows.some(
        (row) =>
          row.checkId === UNCERTAIN_ROW.checkId && row.status === "uncertain",
      ),
    ).toBe(true);
    expect(
      summary.customerAsk.rows.filter((row) => row.status === "fail").length,
    ).toBeGreaterThan(0);
  });

  test("recommends narrow repair when command-path fails", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(summary.commandPath.status).toBe("fail");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain("verifier command-path");
  });

  test("recommends narrow repair when any batch-013 customer-ask row fails", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
      customerAskRows: [PASS_ROW, FAIL_ROW],
    });

    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(summary.recommendationRationale).toContain(
      "glossary.embedding-description-links",
    );
  });

  test("recommends stop-and-wait when command-path and all rows pass", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
      customerAskRows: [PASS_ROW],
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain(
      "Stop and wait for customer Phase 1 advancement",
    );
  });

  test("recommends stop-and-wait when only uncertain evidence remains", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, UNCERTAIN_ROW]),
      customerAskRows: [PASS_ROW, UNCERTAIN_ROW],
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain(
      "module.graph-theme-readability",
    );
  });
});

describe("derivePhase1Batch013ConvergenceRecommendation", () => {
  test("prioritizes command-path fail over passing customer-ask rows", () => {
    const commandPath = deriveVerifierCommandPathEvidence({
      output: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
    });
    const recommendation = derivePhase1Batch013ConvergenceRecommendation({
      commandPath,
      customerAskRows: [PASS_ROW],
    });

    expect(recommendation.recommendation).toBe("queue-one-narrow-repair-batch");
  });
});

describe("getPhase1Batch013ConvergenceExitCode", () => {
  test("returns 1 when command-path fails", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(getPhase1Batch013ConvergenceExitCode(summary)).toBe(1);
  });

  test("returns 1 when any customer-ask row fails", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
      customerAskRows: [PASS_ROW, FAIL_ROW],
    });

    expect(getPhase1Batch013ConvergenceExitCode(summary)).toBe(1);
  });

  test("returns 0 when command-path passes and customer-ask rows are pass or uncertain only", () => {
    const passSummary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW]),
      customerAskRows: [PASS_ROW],
    });
    const uncertainSummary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, UNCERTAIN_ROW]),
      customerAskRows: [PASS_ROW, UNCERTAIN_ROW],
    });

    expect(getPhase1Batch013ConvergenceExitCode(passSummary)).toBe(0);
    expect(getPhase1Batch013ConvergenceExitCode(uncertainSummary)).toBe(0);
  });
});

describe("formatPhase1Batch013ConvergenceEvidenceSummary", () => {
  test("includes header, domain rows, per-checkId sources, and recommendation", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: outputWithReport([PASS_ROW, FAIL_ROW]),
      customerAskRows: [PASS_ROW, FAIL_ROW],
    });
    const report = formatPhase1Batch013ConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_BATCH_013_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("[PASS] verifier-command-path");
    expect(report).toContain("checklistRow=phase-1-built-app-verifier-harness");
    expect(report).toContain("[FAIL] customer-ask-convergence");
    expect(report).toContain(
      "checklistRow=phase-1-batch-013-customer-ask-convergence",
    );
    expect(report).toContain(
      `[PASS] make verify-phase-1-ux — ${PASS_ROW.checkId}`,
    );
    expect(report).toContain(
      `[FAIL] make verify-phase-1-ux — ${FAIL_ROW.checkId}`,
    );
    expect(report).toContain(FAIL_ROW.reason ?? "");
    expect(report).toContain("Recommendation: queue-one-narrow-repair-batch");
    expect(report).toContain("Rationale:");
  });
});
