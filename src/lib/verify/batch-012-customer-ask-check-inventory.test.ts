import { describe, expect, test } from "bun:test";
import {
  assertBatch012CustomerAskReportAllPass,
  BATCH_012_CUSTOMER_ASK_CHECK_IDS,
  BATCH_012_CUSTOMER_ASK_INVENTORY,
  buildBatch012CustomerAskReportSlots,
  orderCustomerAskRowsByBatch012Inventory,
} from "./batch-012-customer-ask-check-inventory";
import { BATCH_012_GLOSSARY_CHECKS } from "./batch-012-glossary-checks";
import { BATCH_012_GQA_MODULE_CHECKS } from "./batch-012-gqa-module-checks";
import { BATCH_012_MISSING_PAGES_CHECKS } from "./batch-012-missing-pages-checks";
import { BATCH_012_MOBILE_HEADER_CHECKS } from "./batch-012-mobile-header-checks";
import { BATCH_012_TAG_SEARCH_DECORATION_CHECKS } from "./batch-012-tag-search-decoration-checks";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

describe("batch-012 customer-ask check inventory", () => {
  test("inventory matches the converged batch-012 report row count", () => {
    expect(BATCH_012_CUSTOMER_ASK_CHECK_IDS.length).toBe(22);
    expect(buildBatch012CustomerAskReportSlots().length).toBe(22);
  });

  test("report slots align check ids with per-route and per-query expansions", () => {
    const slots = buildBatch012CustomerAskReportSlots();
    expect(slots.map((slot) => slot.checkId)).toEqual([
      ...BATCH_012_CUSTOMER_ASK_CHECK_IDS,
    ]);
  });

  test("orderCustomerAskRowsByBatch012Inventory restores deterministic inventory order", () => {
    const slots = buildBatch012CustomerAskReportSlots();
    const rows: CustomerAskConvergenceRow[] = slots.map((slot, index) => ({
      checkId: slot.checkId,
      title: `stub-${index}`,
      status: "pass",
      route: slot.route,
      query: slot.query,
      checklistRow: "phase-1-stub",
    }));
    const shuffled = [...rows].reverse();

    const ordered = orderCustomerAskRowsByBatch012Inventory(shuffled);

    expect(ordered.map((row) => row.checkId)).toEqual([
      ...BATCH_012_CUSTOMER_ASK_CHECK_IDS,
    ]);
    expect(ordered.map((row) => row.route)).toEqual(
      slots.map((slot) => slot.route),
    );
    expect(ordered.map((row) => row.query)).toEqual(
      slots.map((slot) => slot.query),
    );
  });

  test("orderCustomerAskRowsByBatch012Inventory rejects missing inventory slots", () => {
    const slots = buildBatch012CustomerAskReportSlots();
    const rows: CustomerAskConvergenceRow[] = slots.slice(1).map((slot) => ({
      checkId: slot.checkId,
      title: "stub",
      status: "pass",
      route: slot.route,
      query: slot.query,
      checklistRow: "phase-1-stub",
    }));

    expect(() => orderCustomerAskRowsByBatch012Inventory(rows)).toThrow(
      /Missing customer-ask row for batch-012 inventory slot/,
    );
  });

  test("unique inventory entries cover every batch-012 check id once", () => {
    expect(BATCH_012_CUSTOMER_ASK_INVENTORY.length).toBe(18);
    expect(
      new Set(BATCH_012_CUSTOMER_ASK_INVENTORY.map((entry) => entry.checkId))
        .size,
    ).toBe(15);
  });

  test("inventory includes route or query scope for every entry", () => {
    for (const entry of BATCH_012_CUSTOMER_ASK_INVENTORY) {
      expect(entry.route.length).toBeGreaterThan(0);
      expect(entry.checklistRow.length).toBeGreaterThan(0);
    }
  });

  test("inventory maps customer-ask sections to checklist rows", () => {
    const checklistRows = new Set(
      BATCH_012_CUSTOMER_ASK_INVENTORY.map((entry) => entry.checklistRow),
    );
    expect(checklistRows).toEqual(
      new Set([
        "phase-1-header-bar",
        "phase-1-tags-page",
        "phase-1-search-surface",
        "phase-1-glossary-page",
        "phase-1-module-page",
      ]),
    );
  });

  test("inventory includes every batch-012 check definition", () => {
    const expectedCheckIds = [
      BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu.checkId,
      BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline
        .checkId,
      BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration
        .checkId,
      BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      BATCH_012_MISSING_PAGES_CHECKS.attentionRoute.checkId,
      BATCH_012_MISSING_PAGES_CHECKS.vectorRoute.checkId,
      BATCH_012_MISSING_PAGES_CHECKS.hiddenSizeRoute.checkId,
      BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      BATCH_012_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      BATCH_012_GQA_MODULE_CHECKS.singleTagList.checkId,
      BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ];

    expect(
      new Set(BATCH_012_CUSTOMER_ASK_INVENTORY.map((entry) => entry.checkId)),
    ).toEqual(new Set(expectedCheckIds));
  });

  test("report slots expand attention discoverability across search routes", () => {
    const slots = buildBatch012CustomerAskReportSlots().filter(
      (slot) =>
        slot.checkId ===
        BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
    );

    expect(slots).toEqual([
      {
        checkId: BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
        route: "/search",
        query: "attention",
      },
      {
        checkId: BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
        route: "/api/search",
        query: "attention",
      },
    ]);
  });

  test("assertBatch012CustomerAskReportAllPass accepts a full PASS report", () => {
    const lines = BATCH_012_CUSTOMER_ASK_CHECK_IDS.map(
      (checkId) => `[PASS] ${checkId} — stub title — checklistRow=phase-1-stub`,
    );
    const report = [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join(
      "\n",
    );

    expect(() => assertBatch012CustomerAskReportAllPass(report)).not.toThrow();
  });

  test("assertBatch012CustomerAskReportAllPass rejects missing PASS rows", () => {
    const report = [
      CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
      `[PASS] ${BATCH_012_CUSTOMER_ASK_CHECK_IDS[0]} — stub`,
    ].join("\n");

    expect(() => assertBatch012CustomerAskReportAllPass(report)).toThrow(
      /Expected \[PASS\] row/,
    );
  });

  test("assertBatch012CustomerAskReportAllPass rejects missing report header", () => {
    const report = `[PASS] ${BATCH_012_CUSTOMER_ASK_CHECK_IDS[0]} — stub`;

    expect(() => assertBatch012CustomerAskReportAllPass(report)).toThrow(
      /convergence report header/,
    );
  });

  test("assertBatch012CustomerAskReportAllPass rejects [FAIL] rows", () => {
    const lines = BATCH_012_CUSTOMER_ASK_CHECK_IDS.map(
      (checkId) => `[PASS] ${checkId} — stub title — checklistRow=phase-1-stub`,
    );
    lines[0] = `[FAIL] ${BATCH_012_CUSTOMER_ASK_CHECK_IDS[0]} — stub title — checklistRow=phase-1-stub`;
    const report = [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join(
      "\n",
    );

    expect(() => assertBatch012CustomerAskReportAllPass(report)).toThrow(
      /no \[FAIL\] rows/,
    );
  });
});
