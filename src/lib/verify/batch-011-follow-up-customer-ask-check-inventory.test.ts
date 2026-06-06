import { describe, expect, test } from "bun:test";
import {
  assertBatch011FollowUpCustomerAskReportAllPass,
  BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS,
  BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY,
} from "./batch-011-follow-up-customer-ask-check-inventory";
import { BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS } from "./batch-011-follow-up-home-nav-checks";
import { BATCH_011_FOLLOW_UP_SEARCH_CHECKS } from "./batch-011-follow-up-search-checks";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import { HOME_HEADER_CUSTOMER_ASK_CHECKS } from "./customer-ask-home-header-convergence";
import { SEARCH_SURFACE_CUSTOMER_ASK_CHECKS } from "./customer-ask-search-surface-convergence";

describe("batch-011 follow-up customer-ask check inventory", () => {
  test("inventory matches the converged batch-011 follow-up report row count", () => {
    expect(BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS.length).toBe(41);
  });

  test("unique inventory entries cover reused batch-008 and new follow-up checks", () => {
    expect(BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY.length).toBe(27);
    expect(
      new Set(
        BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY.map(
          (entry) => entry.checkId,
        ),
      ).size,
    ).toBe(27);
  });

  test("inventory includes route or query scope for every entry", () => {
    for (const entry of BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY) {
      expect(entry.route.length).toBeGreaterThan(0);
      expect(entry.checklistRow.length).toBeGreaterThan(0);
    }
  });

  test("inventory reuses unchanged batch-008 home and search check ids", () => {
    for (const check of Object.values(HOME_HEADER_CUSTOMER_ASK_CHECKS)) {
      expect(
        BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY.some(
          (entry) => entry.checkId === check.checkId,
        ),
      ).toBe(true);
    }

    for (const checkId of [
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
    ]) {
      expect(
        BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY.some(
          (entry) => entry.checkId === checkId,
        ),
      ).toBe(true);
    }
  });

  test("inventory adds batch-011 follow-up-only check ids", () => {
    for (const check of [
      ...Object.values(BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS),
      ...Object.values(BATCH_011_FOLLOW_UP_SEARCH_CHECKS),
    ]) {
      expect(
        BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY.some(
          (entry) => entry.checkId === check.checkId,
        ),
      ).toBe(true);
    }
  });

  test("assertBatch011FollowUpCustomerAskReportAllPass accepts a full PASS report", () => {
    const lines = BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS.map(
      (checkId) => `[PASS] ${checkId} — stub title — checklistRow=phase-1-stub`,
    );
    const report = [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join(
      "\n",
    );

    expect(() =>
      assertBatch011FollowUpCustomerAskReportAllPass(report),
    ).not.toThrow();
  });

  test("assertBatch011FollowUpCustomerAskReportAllPass rejects missing PASS rows", () => {
    const report = [
      CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
      `[PASS] ${BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS[0]} — stub`,
    ].join("\n");

    expect(() =>
      assertBatch011FollowUpCustomerAskReportAllPass(report),
    ).toThrow(/Expected \[PASS\] row/);
  });

  test("assertBatch011FollowUpCustomerAskReportAllPass rejects missing report header", () => {
    const report = `[PASS] ${BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS[0]} — stub`;

    expect(() =>
      assertBatch011FollowUpCustomerAskReportAllPass(report),
    ).toThrow(/convergence report header/);
  });

  test("assertBatch011FollowUpCustomerAskReportAllPass rejects [FAIL] rows", () => {
    const lines = BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS.map(
      (checkId) => `[PASS] ${checkId} — stub title — checklistRow=phase-1-stub`,
    );
    lines[0] = `[FAIL] ${BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS[0]} — stub title — checklistRow=phase-1-stub`;
    const report = [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join(
      "\n",
    );

    expect(() =>
      assertBatch011FollowUpCustomerAskReportAllPass(report),
    ).toThrow(/no \[FAIL\] rows/);
  });
});
