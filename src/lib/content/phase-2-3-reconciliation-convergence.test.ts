import { describe, expect, test } from "bun:test";
import {
  formatPhase23ReconciliationConvergenceReport,
  getPhase23ReconciliationConvergenceExitCode,
  PHASE_2_3_RECONCILIATION_CONVERGENCE_GATE_HEADER,
  runArchitectureForwardLinksGate,
  runAttentionTagGroupingGate,
  runPhase23ReconciliationConvergenceGate,
  runRegistryValidationGate,
  runRepresentativeSearchQueriesGate,
  runSearchDocumentKindFacetsGate,
  runSourceDiscoveryGate,
} from "./phase-2-3-reconciliation-convergence";

describe("Phase 2/3 reconciliation convergence gate (US-012)", () => {
  test("registry validation gate passes with zero errors", async () => {
    const result = await runRegistryValidationGate();
    expect(result.status).toBe("pass");
  });

  test("source discovery gate resolves every batch 017 URL", async () => {
    const result = await runSourceDiscoveryGate();
    expect(result.status).toBe("pass");
  });

  test("attention tag grouping gate lists all published attention modules", async () => {
    const result = await runAttentionTagGroupingGate();
    expect(result.status).toBe("pass");
  });

  test("architecture-forward links gate surfaces live model-family targets", async () => {
    const result = await runArchitectureForwardLinksGate();
    expect(result.status).toBe("pass");
  });

  test("search document kind facets gate indexes batch 017 pages by kind", async () => {
    const result = await runSearchDocumentKindFacetsGate();
    expect(result.status).toBe("pass");
  });

  test("representative search queries gate ranks canonical pages with kind metadata", async () => {
    const result = await runRepresentativeSearchQueriesGate();
    expect(result.status).toBe("pass");
  });

  test("combined convergence gate reports pass for all domains", async () => {
    const results = await runPhase23ReconciliationConvergenceGate();

    expect(results).toHaveLength(6);
    expect(getPhase23ReconciliationConvergenceExitCode(results)).toBe(0);
    expect(results.every((result) => result.status === "pass")).toBe(true);

    const report = formatPhase23ReconciliationConvergenceReport(results);
    expect(report).toContain(PHASE_2_3_RECONCILIATION_CONVERGENCE_GATE_HEADER);
    expect(report).toContain("[PASS] Registry validation passes");
    expect(report).toContain("[PASS] Fumadocs source discovers");
    expect(report).toContain("[PASS] /tags/attention lists");
    expect(report).toContain("[PASS] Architecture-forward navigation");
    expect(report).toContain("[PASS] Search documents index");
    expect(report).toContain("[PASS] Representative search queries");
  });
});
