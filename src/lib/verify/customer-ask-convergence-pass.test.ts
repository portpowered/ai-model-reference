import { describe, expect, test } from "bun:test";
import {
  derivePhase1CiBlockerDomainEvidence,
  formatPhase1CiBlockerDomainReport,
  getPhase1ConvergencePassExitCode,
  PHASE_1_BATCH_009_CI_DOMAIN_DEFINITIONS,
  PHASE_1_CONVERGENCE_PASS_CI_REPORT_HEADER,
  PHASE_1_CONVERGENCE_PASS_PREREQUISITES,
  PHASE_1_CONVERGENCE_PASS_WORKFLOW_STEPS,
} from "./phase-1-convergence-pass";

describe("derivePhase1CiBlockerDomainEvidence", () => {
  test("marks all batch-009 domains pass when CI passed", () => {
    const evidence = derivePhase1CiBlockerDomainEvidence("make ci ok", true);

    expect(evidence).toHaveLength(
      PHASE_1_BATCH_009_CI_DOMAIN_DEFINITIONS.length,
    );
    expect(evidence.every((row) => row.status === "pass")).toBe(true);
  });

  test("marks GQA domain fail when grouped-query-attention built route script fails", () => {
    const output = [
      "Grouped-query-attention built route convergence verification failed:",
      '  missing data-graph-node-id="gqa-query-heads"',
    ].join("\n");
    const evidence = derivePhase1CiBlockerDomainEvidence(output, false);
    const gqa = evidence.find(
      (row) => row.domainId === "gqa-module-graph-build-markers",
    );

    expect(gqa?.status).toBe("fail");
    expect(gqa?.reason).toContain(
      "Grouped-query-attention built route convergence verification failed",
    );
  });

  test("marks docs footer domain fail when footer hover CSS test fails", () => {
    const output =
      "docs page footer hover convergence (built HTML) > bundled app CSS includes footer sublabel hover/focus inherit rule";
    const evidence = derivePhase1CiBlockerDomainEvidence(output, false);
    const footer = evidence.find(
      (row) => row.domainId === "docs-footer-hover-focus-parity",
    );

    expect(footer?.status).toBe("fail");
    expect(footer?.reason).toContain("footer sublabel hover/focus inherit");
  });

  test("marks route gate domain fail when static route verification fails", () => {
    const output = "verify-phase-1-static-routes script failed: missing route";
    const evidence = derivePhase1CiBlockerDomainEvidence(output, false);
    const routeGate = evidence.find(
      (row) => row.domainId === "phase-1-route-gate",
    );

    expect(routeGate?.status).toBe("fail");
    expect(routeGate?.reason).toContain("verify-phase-1-static-routes");
  });

  test("leaves unrelated CI failures without domain-specific fail rows", () => {
    const output = "Biome lint failed in src/components/Button.tsx";
    const evidence = derivePhase1CiBlockerDomainEvidence(output, false);

    expect(evidence.every((row) => row.status === "pass")).toBe(true);
  });
});

describe("formatPhase1CiBlockerDomainReport", () => {
  test("includes header and checklist rows", () => {
    const evidence = derivePhase1CiBlockerDomainEvidence("", true);
    const report = formatPhase1CiBlockerDomainReport(evidence);

    expect(report.split("\n")[0]).toBe(
      PHASE_1_CONVERGENCE_PASS_CI_REPORT_HEADER,
    );
    expect(report).toContain("checklistRow=phase-1-module-page");
    expect(report).toContain("checklistRow=phase-1-docs-footer");
    expect(report).toContain("source=make ci");
  });
});

describe("getPhase1ConvergencePassExitCode", () => {
  test("returns 0 only when CI and verify both pass", () => {
    expect(
      getPhase1ConvergencePassExitCode({ ciExitCode: 0, verifyExitCode: 0 }),
    ).toBe(0);
    expect(
      getPhase1ConvergencePassExitCode({ ciExitCode: 1, verifyExitCode: 0 }),
    ).toBe(1);
    expect(
      getPhase1ConvergencePassExitCode({ ciExitCode: 0, verifyExitCode: 1 }),
    ).toBe(1);
    expect(
      getPhase1ConvergencePassExitCode({ ciExitCode: 1, verifyExitCode: 1 }),
    ).toBe(1);
  });
});

describe("phase-1 convergence pass workflow constants", () => {
  test("documents ordered make ci then build+verify workflow", () => {
    expect(PHASE_1_CONVERGENCE_PASS_WORKFLOW_STEPS).toEqual([
      "make ci",
      "make build && make internal-verify-phase-1-ux",
    ]);
    expect(PHASE_1_CONVERGENCE_PASS_PREREQUISITES.length).toBeGreaterThan(0);
    expect(PHASE_1_CONVERGENCE_PASS_PREREQUISITES.join("\n")).toMatch(
      /Playwright Chromium/,
    );
  });
});
