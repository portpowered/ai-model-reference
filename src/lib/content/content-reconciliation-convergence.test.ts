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

const REGISTRY_VALIDATION_GATE_TIMEOUT_MS = 10_000;
const ATTENTION_TAG_GROUPING_GATE_TIMEOUT_MS = 15_000;
const COMBINED_CONVERGENCE_GATE_TIMEOUT_MS = 30_000;

describe("Phase 2/3 reconciliation convergence gate (US-012)", () => {
  test(
    "registry validation gate passes with zero errors",
    async () => {
      const result = await runRegistryValidationGate();
      expect(result.status).toBe("pass");
    },
    { timeout: REGISTRY_VALIDATION_GATE_TIMEOUT_MS },
  );

  test("source discovery gate resolves every batch 017 URL", async () => {
    const result = await runSourceDiscoveryGate();
    expect(result.status).toBe("pass");
  });

  test(
    "attention tag grouping gate lists all published attention modules",
    async () => {
      const result = await runAttentionTagGroupingGate();
      expect(result.status).toBe("pass");
    },
    { timeout: ATTENTION_TAG_GROUPING_GATE_TIMEOUT_MS },
  );

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

  test(
    "combined convergence gate reports pass for all domains",
    async () => {
      const results = await runPhase23ReconciliationConvergenceGate();

      expect(results).toHaveLength(6);
      expect(getPhase23ReconciliationConvergenceExitCode(results)).toBe(0);
      expect(results.every((result) => result.status === "pass")).toBe(true);
      const report = formatPhase23ReconciliationConvergenceReport(results);
      expect(report).toContain(
        PHASE_2_3_RECONCILIATION_CONVERGENCE_GATE_HEADER,
      );
      expect(report).toContain("[PASS] Registry validation passes");
      expect(report).toContain("[PASS] Fumadocs source resolves");
      expect(report).toContain("[PASS] Representative tag landing routes");
      expect(report).toContain("[PASS] Architecture-forward navigation");
      expect(report).toContain(
        "[PASS] Search documents index representative routes",
      );
      expect(report).toContain(
        "[PASS] Representative search queries stay aligned",
      );
    },
    { timeout: COMBINED_CONVERGENCE_GATE_TIMEOUT_MS },
  );
});
