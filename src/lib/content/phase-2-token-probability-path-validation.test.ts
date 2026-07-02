import { describe, expect, test } from "bun:test";
import {
  formatTokenProbabilityPathValidationReport,
  getTokenProbabilityPathValidationExitCode,
  PHASE_2_TOKEN_PROBABILITY_PATH_VALIDATION_GATE_HEADER,
  runTargetPathRouteGate,
  runTargetPathSearchDocumentsGate,
  runTokenProbabilityPathValidationGate,
  runTokenRelatedDocsGate,
} from "./phase-2-token-probability-path-validation";

describe("Phase 2 token-probability path validation gate (phase-2-token-probability-path-convergence-006)", () => {
  test("target-path route gate passes for published glossary routes and messages", async () => {
    const result = await runTargetPathRouteGate();
    expect(result.status).toBe("pass");
  });

  test("target-path search documents gate passes with UI-ready metadata", async () => {
    const result = await runTargetPathSearchDocumentsGate();
    expect(result.status).toBe("pass");
  });

  test("token related-docs gate passes with special tokens plus embedding, vocabulary size, logit, and softmax explanations", async () => {
    const result = await runTokenRelatedDocsGate();
    expect(result.status).toBe("pass");
  });

  test("combined validation gate reports pass for all path domains using local builders only", async () => {
    const results = await runTokenProbabilityPathValidationGate();

    expect(results).toHaveLength(3);
    expect(getTokenProbabilityPathValidationExitCode(results)).toBe(0);
    expect(results.every((result) => result.status === "pass")).toBe(true);

    const report = formatTokenProbabilityPathValidationReport(results);
    expect(report).toContain(
      PHASE_2_TOKEN_PROBABILITY_PATH_VALIDATION_GATE_HEADER,
    );
    expect(report).toContain(
      "[PASS] Token, embedding, logit, and softmax publish with valid registry IDs and default-locale messages",
    );
    expect(report).toContain(
      "[PASS] Search documents for token, embedding, logit, and softmax include route, title, kind/facet, aliases or tags, and summary data",
    );
    expect(report).toContain(
      "[PASS] Token related-doc data includes embedding, vocabulary size, logit, and softmax with relationship explanations",
    );
  });
});
