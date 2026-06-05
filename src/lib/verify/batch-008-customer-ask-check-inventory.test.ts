import { describe, expect, test } from "bun:test";
import {
  assertBatch008CustomerAskReportAllPass,
  BATCH_008_CUSTOMER_ASK_CHECK_IDS,
} from "./batch-008-customer-ask-check-inventory";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";

describe("batch-008 customer-ask check inventory", () => {
  test("inventory matches the converged batch-008 report row count", () => {
    expect(BATCH_008_CUSTOMER_ASK_CHECK_IDS.length).toBe(26);
  });

  test("assertBatch008CustomerAskReportAllPass accepts a full PASS report", () => {
    const lines = BATCH_008_CUSTOMER_ASK_CHECK_IDS.map(
      (checkId) => `[PASS] ${checkId} — stub title — checklistRow=phase-1-stub`,
    );
    const report = [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join(
      "\n",
    );

    expect(() => assertBatch008CustomerAskReportAllPass(report)).not.toThrow();
  });

  test("assertBatch008CustomerAskReportAllPass rejects missing PASS rows", () => {
    const report = [
      CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
      `[PASS] ${BATCH_008_CUSTOMER_ASK_CHECK_IDS[0]} — stub`,
    ].join("\n");

    expect(() => assertBatch008CustomerAskReportAllPass(report)).toThrow(
      /Expected \[PASS\] row/,
    );
  });
});
