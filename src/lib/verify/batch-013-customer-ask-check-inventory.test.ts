import { describe, expect, test } from "bun:test";
import {
  assertBatch013CustomerAskReportAllPass,
  BATCH_013_CUSTOMER_ASK_CHECK_IDS,
  BATCH_013_CUSTOMER_ASK_INVENTORY,
  buildBatch013CustomerAskReportSlots,
  extractBatch013CustomerAskRowsFromReport,
  orderCustomerAskRowsByBatch013Inventory,
} from "./batch-013-customer-ask-check-inventory";
import {
  BATCH_013_GLOSSARY_CHECKS,
  BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_013_GLOSSARY_ROUTES,
} from "./batch-013-glossary-checks";
import { BATCH_013_GQA_MODULE_CHECKS } from "./batch-013-gqa-module-checks";
import { BATCH_013_ROUTE_CHECKS } from "./batch-013-route-checks";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

describe("batch-013 customer-ask check inventory", () => {
  test("inventory matches the converged batch-013 report row count", () => {
    expect(BATCH_013_CUSTOMER_ASK_CHECK_IDS.length).toBe(13);
    expect(buildBatch013CustomerAskReportSlots().length).toBe(13);
    expect(BATCH_013_CUSTOMER_ASK_INVENTORY.length).toBe(13);
  });

  test("report slots align check ids with per-route opening-summary expansions", () => {
    const slots = buildBatch013CustomerAskReportSlots();
    expect(slots.map((slot) => slot.checkId)).toEqual([
      ...BATCH_013_CUSTOMER_ASK_CHECK_IDS,
    ]);
  });

  test("orderCustomerAskRowsByBatch013Inventory restores deterministic inventory order", () => {
    const slots = buildBatch013CustomerAskReportSlots();
    const rows: CustomerAskConvergenceRow[] = slots.map((slot, index) => ({
      checkId: slot.checkId,
      title: `stub-${index}`,
      status: "pass",
      route: slot.route,
      query: slot.query,
      checklistRow: "phase-1-stub",
    }));
    const shuffled = [...rows].reverse();

    const ordered = orderCustomerAskRowsByBatch013Inventory(shuffled);

    expect(ordered.map((row) => row.checkId)).toEqual([
      ...BATCH_013_CUSTOMER_ASK_CHECK_IDS,
    ]);
    expect(ordered.map((row) => row.route)).toEqual(
      slots.map((slot) => slot.route),
    );
    expect(ordered.map((row) => row.query)).toEqual(
      slots.map((slot) => slot.query),
    );
  });

  test("extractBatch013CustomerAskRowsFromReport keeps batch-013 rows and marks missing slots fail", () => {
    const slots = buildBatch013CustomerAskReportSlots();
    const present = slots[0];
    const rows: CustomerAskConvergenceRow[] = [
      {
        checkId: present.checkId,
        title: "present row",
        status: "pass",
        route: present.route,
        query: present.query,
        checklistRow: "phase-1-glossary-page",
      },
      {
        checkId: "home.mobile-hamburger-menu",
        title: "extra retained row",
        status: "pass",
        route: "/",
        checklistRow: "phase-1-header-bar",
      },
    ];

    const extracted = extractBatch013CustomerAskRowsFromReport(rows);
    expect(extracted).toHaveLength(13);
    expect(extracted[0].status).toBe("pass");
    expect(extracted.filter((row) => row.status === "fail")).toHaveLength(12);
    expect(
      extracted
        .filter((row) => row.status === "fail")
        .every(
          (row) =>
            row.reason === "missing from customer-ask convergence report",
        ),
    ).toBe(true);
  });

  test("orderCustomerAskRowsByBatch013Inventory rejects missing inventory slots", () => {
    const slots = buildBatch013CustomerAskReportSlots();
    const rows: CustomerAskConvergenceRow[] = slots.slice(1).map((slot) => ({
      checkId: slot.checkId,
      title: "stub",
      status: "pass",
      route: slot.route,
      query: slot.query,
      checklistRow: "phase-1-stub",
    }));

    expect(() => orderCustomerAskRowsByBatch013Inventory(rows)).toThrow(
      /Missing customer-ask row for batch-013 inventory slot/,
    );
  });

  test("inventory includes route scope and title for every entry", () => {
    for (const entry of BATCH_013_CUSTOMER_ASK_INVENTORY) {
      expect(entry.route.length).toBeGreaterThan(0);
      expect(entry.checklistRow.length).toBeGreaterThan(0);
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });

  test("inventory maps customer-ask sections to glossary and module checklist rows", () => {
    const checklistRows = new Set(
      BATCH_013_CUSTOMER_ASK_INVENTORY.map((entry) => entry.checklistRow),
    );
    expect(checklistRows).toEqual(
      new Set(["phase-1-glossary-page", "phase-1-module-page"]),
    );
  });

  test("opening-summary coverage includes token, embedding, vector, and hidden-size routes", () => {
    const openingSummaryEntries = BATCH_013_CUSTOMER_ASK_INVENTORY.filter(
      (entry) =>
        entry.checkId ===
        BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
    );

    expect(openingSummaryEntries.map((entry) => entry.route)).toEqual([
      ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
    ]);
    expect(openingSummaryEntries.map((entry) => entry.route)).toEqual([
      BATCH_013_GLOSSARY_ROUTES.token,
      BATCH_013_GLOSSARY_ROUTES.embedding,
      BATCH_013_GLOSSARY_ROUTES.vector,
      BATCH_013_GLOSSARY_ROUTES.hiddenSize,
    ]);
  });

  test("inventory includes only the reopened batch-013 check definitions", () => {
    const expectedCheckIds = [
      ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES.map(
        () => BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      ),
      BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
      BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
      BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      BATCH_013_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      BATCH_013_GQA_MODULE_CHECKS.singleTagList.checkId,
      BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ];

    expect(
      BATCH_013_CUSTOMER_ASK_INVENTORY.map((entry) => entry.checkId),
    ).toEqual(expectedCheckIds);
  });

  test("report slots expand opening-summary across the reopened glossary routes", () => {
    const slots = buildBatch013CustomerAskReportSlots().filter(
      (slot) =>
        slot.checkId ===
        BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
    );

    expect(slots).toEqual(
      BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES.map((route) => ({
        checkId: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
        route,
      })),
    );
  });

  test("assertBatch013CustomerAskReportAllPass accepts a full PASS report", () => {
    const lines = BATCH_013_CUSTOMER_ASK_CHECK_IDS.map(
      (checkId) => `[PASS] ${checkId} — stub title — checklistRow=phase-1-stub`,
    );
    const report = [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join(
      "\n",
    );

    expect(() => assertBatch013CustomerAskReportAllPass(report)).not.toThrow();
  });

  test("assertBatch013CustomerAskReportAllPass rejects missing PASS rows", () => {
    const report = [
      CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
      `[PASS] ${BATCH_013_CUSTOMER_ASK_CHECK_IDS[0]} — stub`,
    ].join("\n");

    expect(() => assertBatch013CustomerAskReportAllPass(report)).toThrow(
      /Expected \[PASS\] row/,
    );
  });

  test("assertBatch013CustomerAskReportAllPass rejects missing report header", () => {
    const report = `[PASS] ${BATCH_013_CUSTOMER_ASK_CHECK_IDS[0]} — stub`;

    expect(() => assertBatch013CustomerAskReportAllPass(report)).toThrow(
      /convergence report header/,
    );
  });

  test("assertBatch013CustomerAskReportAllPass rejects [FAIL] rows", () => {
    const lines = BATCH_013_CUSTOMER_ASK_CHECK_IDS.map(
      (checkId) => `[PASS] ${checkId} — stub title — checklistRow=phase-1-stub`,
    );
    lines[0] = `[FAIL] ${BATCH_013_CUSTOMER_ASK_CHECK_IDS[0]} — stub title — checklistRow=phase-1-stub`;
    const report = [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join(
      "\n",
    );

    expect(() => assertBatch013CustomerAskReportAllPass(report)).toThrow(
      /no \[FAIL\] rows/,
    );
  });
});
