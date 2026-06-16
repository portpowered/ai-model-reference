import { describe, expect, test } from "bun:test";
import {
  formatCustomerAskConvergenceLine,
  formatCustomerAskConvergenceReport,
} from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildPhase1ConvergenceEvidenceSummary,
  derivePhase1ConvergenceRecommendation,
  derivePhase1UxFailureFromVerifyOutput,
  formatPhase1ConvergenceEvidenceSummary,
  PHASE_1_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  parseCustomerAskConvergenceReport,
} from "./phase-1-convergence-evidence";
import { derivePhase1CiBlockerDomainEvidence } from "./phase-1-convergence-pass";
import { PHASE_1_UX_SUCCESS_MESSAGE } from "./phase-1-ux-verifier";

const PASS_ROW: CustomerAskConvergenceRow = {
  checkId: "home.header-search-entry",
  title: "Home exposes header-only search entry",
  status: "pass",
  route: "/",
  checklistRow: "phase-1-home-header-polish",
};

const GQA_PASS_ROW: CustomerAskConvergenceRow = {
  checkId: "module.graph-build-markers",
  title: "GQA module page exposes required graph accessibility/build markers",
  status: "pass",
  route: "/docs/modules/grouped-query-attention",
  checklistRow: "phase-1-module-page",
};

const FOOTER_FAIL_ROW: CustomerAskConvergenceRow = {
  checkId: "docs.footer-hover-focus-parity",
  title:
    "Docs footer previous/next sublabels inherit accent foreground on hover and focus-visible",
  status: "fail",
  route: "/docs/glossary/token",
  reason:
    "bundled app CSS missing footer sublabel hover/focus inherit rule pairing",
  checklistRow: "phase-1-docs-footer",
};

const ROUTE_FAIL_ROW: CustomerAskConvergenceRow = {
  checkId: "search.page.page-level-hits",
  title: "Search page lists canonical page-level hits without fragment URLs",
  status: "fail",
  route: "/search",
  query: "GQA",
  reason: "first visible result URL includes a hash fragment",
  checklistRow: "phase-1-search-surface",
};

function allPassRows(): CustomerAskConvergenceRow[] {
  return [
    PASS_ROW,
    GQA_PASS_ROW,
    {
      checkId: "docs.footer-hover-focus-parity",
      title:
        "Docs footer previous/next sublabels inherit accent foreground on hover and focus-visible",
      status: "pass",
      route: "/docs/glossary/token",
      checklistRow: "phase-1-docs-footer",
    },
    {
      checkId: "module.presentation",
      title:
        "GQA module page uses React Flow renderer and converged section content",
      status: "pass",
      route: "/docs/modules/grouped-query-attention",
      checklistRow: "phase-1-module-page",
    },
  ];
}

describe("parseCustomerAskConvergenceReport", () => {
  test("round-trips formatted customer-ask rows from verifier stdout", () => {
    const report = formatCustomerAskConvergenceReport([
      PASS_ROW,
      FOOTER_FAIL_ROW,
      ROUTE_FAIL_ROW,
    ]);
    const output = `Phase 1 search verification failed\n${report}\n`;
    const parsed = parseCustomerAskConvergenceReport(output);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]?.checkId).toBe("home.header-search-entry");
    expect(parsed[1]?.status).toBe("fail");
    expect(parsed[1]?.reason).toBe(FOOTER_FAIL_ROW.reason);
    expect(parsed[2]?.query).toBe("GQA");
  });

  test("returns empty rows when report header is absent", () => {
    expect(parseCustomerAskConvergenceReport("no report here")).toEqual([]);
  });

  test("preserves route and multi-segment reasons on uncertain rows", () => {
    const uncertainRow: CustomerAskConvergenceRow = {
      checkId: "module.graph-theme-readability",
      title:
        "GQA module React Flow graph exposes readable theme markers for node colors",
      status: "uncertain",
      route: "/docs/modules/grouped-query-attention",
      reason:
        "React Flow node theme markers present but node color contrast is not provable from static HTML — see factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md",
      checklistRow: "phase-1-module-page",
    };
    const report = formatCustomerAskConvergenceReport([uncertainRow]);
    const parsed = parseCustomerAskConvergenceReport(report);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(uncertainRow);
  });
});

describe("derivePhase1UxFailureFromVerifyOutput", () => {
  test("detects legacy UX failure without treating customer-ask failures as UX failures", () => {
    const output =
      "Phase 1 docs shell convergence verification failed: missing shell marker\n";
    expect(derivePhase1UxFailureFromVerifyOutput(output)).toEqual({
      failed: true,
      reason:
        "Phase 1 docs shell convergence verification failed: missing shell marker",
    });
  });

  test("returns pass when success message is present", () => {
    const output = `${PHASE_1_UX_SUCCESS_MESSAGE}\n`;
    expect(derivePhase1UxFailureFromVerifyOutput(output)).toEqual({
      failed: false,
    });
  });
});

describe("buildPhase1ConvergenceEvidenceSummary", () => {
  test("maps all three blocker domains with CI and verify sources", () => {
    const ciEvidence = derivePhase1CiBlockerDomainEvidence("", true);
    const summary = buildPhase1ConvergenceEvidenceSummary({
      ciEvidence,
      customerAskRows: allPassRows(),
      verifyOutput: `${PHASE_1_UX_SUCCESS_MESSAGE}\n`,
    });

    expect(summary.domains).toHaveLength(3);
    expect(summary.domains.map((domain) => domain.domainId)).toEqual([
      "gqa-module-graph-build-markers",
      "docs-footer-hover-focus-parity",
      "phase-1-route-gate",
    ]);
    for (const domain of summary.domains) {
      expect(domain.sources).toHaveLength(2);
      expect(domain.sources[0]?.source).toBe("make ci");
      expect(domain.sources[1]?.source).toBe("make verify-phase-1-ux");
    }
  });

  test("marks footer domain fail when verify row fails even if CI passed", () => {
    const ciEvidence = derivePhase1CiBlockerDomainEvidence("", true);
    const summary = buildPhase1ConvergenceEvidenceSummary({
      ciEvidence,
      customerAskRows: [PASS_ROW, GQA_PASS_ROW, FOOTER_FAIL_ROW],
      verifyOutput: `${PHASE_1_UX_SUCCESS_MESSAGE}\n`,
    });
    const footer = summary.domains.find(
      (domain) => domain.domainId === "docs-footer-hover-focus-parity",
    );

    expect(footer?.status).toBe("fail");
    expect(footer?.sources[1]?.checkIdOrAssertion).toBe(
      "docs.footer-hover-focus-parity",
    );
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
  });

  test("marks route gate fail when legacy Phase 1 UX fails", () => {
    const ciEvidence = derivePhase1CiBlockerDomainEvidence("", true);
    const summary = buildPhase1ConvergenceEvidenceSummary({
      ciEvidence,
      customerAskRows: allPassRows(),
      verifyOutput:
        "Phase 1 route verification failed: missing /docs/modules/grouped-query-attention marker\n",
    });
    const routeGate = summary.domains.find(
      (domain) => domain.domainId === "phase-1-route-gate",
    );

    expect(routeGate?.status).toBe("fail");
    expect(routeGate?.sources[1]?.checkIdOrAssertion).toBe("phase-1-legacy-ux");
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
  });
});

describe("derivePhase1ConvergenceRecommendation", () => {
  test("recommends narrow repair when any domain fails", () => {
    const ciEvidence = derivePhase1CiBlockerDomainEvidence("", true);
    const summary = buildPhase1ConvergenceEvidenceSummary({
      ciEvidence,
      customerAskRows: [PASS_ROW, GQA_PASS_ROW, FOOTER_FAIL_ROW],
      verifyOutput: `${PHASE_1_UX_SUCCESS_MESSAGE}\n`,
    });

    expect(derivePhase1ConvergenceRecommendation(summary.domains)).toEqual({
      recommendation: "queue-one-narrow-repair-batch",
      rationale: expect.stringContaining("docs-footer-hover-focus-parity"),
    });
  });

  test("recommends stop-and-wait when all domains pass", () => {
    const ciEvidence = derivePhase1CiBlockerDomainEvidence("", true);
    const summary = buildPhase1ConvergenceEvidenceSummary({
      ciEvidence,
      customerAskRows: allPassRows(),
      verifyOutput: `${PHASE_1_UX_SUCCESS_MESSAGE}\n`,
    });

    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.recommendationRationale).toContain(
      "All batch-009 blocker domains passed",
    );
  });
});

describe("formatPhase1ConvergenceEvidenceSummary", () => {
  test("includes header, domain rows, sources, and recommendation", () => {
    const ciEvidence = derivePhase1CiBlockerDomainEvidence("", true);
    const summary = buildPhase1ConvergenceEvidenceSummary({
      ciEvidence,
      customerAskRows: allPassRows(),
      verifyOutput: `${PHASE_1_UX_SUCCESS_MESSAGE}\n`,
    });
    const report = formatPhase1ConvergenceEvidenceSummary(summary);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    );
    expect(report).toContain("checklistRow=phase-1-module-page");
    expect(report).toContain("checklistRow=phase-1-docs-footer");
    expect(report).toContain("checklistRow=phase-1-route-gate");
    expect(report).toContain("[PASS] make ci —");
    expect(report).toContain("make verify-phase-1-ux");
    expect(report).toContain(
      "Recommendation: stop-and-wait-for-phase-advancement",
    );
    expect(report).toContain("Rationale:");
  });

  test("preserves formatted customer-ask line parsing for pass rows", () => {
    const line = formatCustomerAskConvergenceLine(PASS_ROW);
    const report = formatCustomerAskConvergenceReport([PASS_ROW]);
    const parsed = parseCustomerAskConvergenceReport(report);
    expect(parsed[0]).toEqual(PASS_ROW);
    expect(line).toContain("checklistRow=phase-1-home-header-polish");
  });
});
