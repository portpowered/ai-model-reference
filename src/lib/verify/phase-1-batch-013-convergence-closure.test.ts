import { describe, expect, test } from "bun:test";
import {
  BATCH_013_CUSTOMER_ASK_CHECK_IDS,
  BATCH_013_CUSTOMER_ASK_INVENTORY,
  buildBatch013CustomerAskReportSlots,
  orderCustomerAskRowsByBatch013Inventory,
} from "./batch-013-customer-ask-check-inventory";
import { BATCH_013_GLOSSARY_ROUTES } from "./batch-013-glossary-checks";
import { buildBatch013GlossaryRouteConvergenceRows } from "./batch-013-glossary-page-convergence";
import {
  POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
  POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
  PRE_REPAIR_HIDDEN_SIZE_ROUTE_HTML,
  PRE_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
} from "./batch-013-glossary-page-convergence.test";
import { BATCH_013_GQA_MODULE_CHECKS } from "./batch-013-gqa-module-checks";
import { buildBatch013GqaModuleDeduplicationRows } from "./batch-013-gqa-module-deduplication-convergence";
import { POST_REPAIR_BATCH_013_GQA_MODULE_HTML } from "./batch-013-gqa-module-deduplication-convergence.test";
import { buildBatch013GqaModuleGraphMathRows } from "./batch-013-gqa-module-graph-math-convergence";
import { POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML } from "./batch-013-gqa-module-graph-math-convergence.test";
import { BATCH_013_ROUTE_PATHS } from "./batch-013-route-checks";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
  POST_REPAIR_TOKEN_GLOSSARY_HTML,
  PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
  PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
} from "./customer-ask-glossary-page-convergence.test";
import {
  MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID,
  MISSING_PAGES_VECTOR_REGISTRY_ID,
} from "./customer-ask-missing-pages-convergence";
import {
  assertBatch013CommandPathFailureIsActionable,
  assertBatch013ConvergenceClosureReady,
  assertBatch013ConvergencePreRepairEvidence,
  assertBatch013CustomerAskRowsPassOrUncertain,
} from "./phase-1-batch-013-convergence-closure";
import {
  buildPhase1Batch013ConvergenceEvidenceSummary,
  formatPhase1Batch013ConvergenceEvidenceSummary,
  PHASE_1_BATCH_013_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-batch-013-convergence-evidence";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

const POST_REPAIR_HTML_BY_ROUTE = {
  [BATCH_013_GLOSSARY_ROUTES.token]: POST_REPAIR_TOKEN_GLOSSARY_HTML,
  [BATCH_013_GLOSSARY_ROUTES.embedding]: POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
  [BATCH_013_GLOSSARY_ROUTES.vector]: POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
  [BATCH_013_GLOSSARY_ROUTES.hiddenSize]:
    POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
  [BATCH_013_ROUTE_PATHS.vectorGlossary]: `
    <html>
      <h1>Vector</h1>
      <article data-registry-id="${MISSING_PAGES_VECTOR_REGISTRY_ID}"></article>
    </html>
  `,
  [BATCH_013_ROUTE_PATHS.hiddenSizeGlossary]: `
    <html>
      <h1>Hidden Size</h1>
      <article data-registry-id="${MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID}"></article>
    </html>
  `,
} as const;

function buildFullBatch013CustomerAskRows(
  options: {
    glossaryHtmlByRoute?: Readonly<Record<string, string>>;
    gqaModuleHtml?: string;
    gqaGraphMathHtml?: string;
  } = {},
): CustomerAskConvergenceRow[] {
  return [
    ...buildBatch013GlossaryRouteConvergenceRows({
      htmlByRoute: options.glossaryHtmlByRoute ?? POST_REPAIR_HTML_BY_ROUTE,
    }),
    ...buildBatch013GqaModuleDeduplicationRows(
      options.gqaModuleHtml ?? POST_REPAIR_BATCH_013_GQA_MODULE_HTML,
    ),
    ...buildBatch013GqaModuleGraphMathRows(
      options.gqaGraphMathHtml ?? POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
    ),
  ];
}

function fullBatch013InventoryPassReport(): string {
  return formatCustomerAskConvergenceReport(buildFullBatch013CustomerAskRows());
}

function preRepairBatch013InventoryFailReport(): string {
  return formatCustomerAskConvergenceReport(
    buildFullBatch013CustomerAskRows({
      glossaryHtmlByRoute: {
        ...POST_REPAIR_HTML_BY_ROUTE,
        [BATCH_013_GLOSSARY_ROUTES.token]:
          PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
        [BATCH_013_GLOSSARY_ROUTES.embedding]:
          PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
        [BATCH_013_GLOSSARY_ROUTES.vector]:
          PRE_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
        [BATCH_013_ROUTE_PATHS.hiddenSizeGlossary]:
          PRE_REPAIR_HIDDEN_SIZE_ROUTE_HTML,
      },
    }),
  );
}

function outputWithSummary(verifyOutput: string): string {
  const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
    verifyOutput,
  });
  return `${verifyOutput}\n${formatPhase1Batch013ConvergenceEvidenceSummary(summary)}`;
}

describe("batch-013 post-repair inventory coverage", () => {
  test("passing fixture bundle yields pass or documented uncertain for every inventory row", () => {
    const rows = buildFullBatch013CustomerAskRows();
    const ordered = assertBatch013CustomerAskRowsPassOrUncertain(rows);

    expect(ordered).toHaveLength(BATCH_013_CUSTOMER_ASK_CHECK_IDS.length);
    expect(ordered.some((row) => row.status === "fail")).toBe(false);
    expect(
      ordered.find(
        (row) =>
          row.checkId ===
          BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      )?.status,
    ).toBe("uncertain");
  });

  test("orderCustomerAskRowsByBatch013Inventory restores deterministic inventory order", () => {
    const rows = buildFullBatch013CustomerAskRows();
    const shuffled = [...rows].reverse();

    const ordered = orderCustomerAskRowsByBatch013Inventory(shuffled);
    const slots = buildBatch013CustomerAskReportSlots();

    expect(ordered.map((row) => row.checkId)).toEqual([
      ...BATCH_013_CUSTOMER_ASK_CHECK_IDS,
    ]);
    expect(ordered.map((row) => row.route)).toEqual(
      slots.map((slot) => slot.route),
    );
  });
});

describe("assertBatch013ConvergenceClosureReady", () => {
  test("accepts command-path pass with full inventory and stop-and-wait recommendation", () => {
    const output = outputWithSummary(fullBatch013InventoryPassReport());

    const summary = assertBatch013ConvergenceClosureReady(output);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(summary.customerAsk.rows).toHaveLength(
      BATCH_013_CUSTOMER_ASK_INVENTORY.length,
    );
  });

  test("accepts uncertain graph-theme row with stop-and-wait recommendation", () => {
    const output = outputWithSummary(fullBatch013InventoryPassReport());

    const summary = assertBatch013ConvergenceClosureReady(output);
    const themeRow = summary.customerAsk.rows.find(
      (row) =>
        row.checkId ===
        BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
    );
    expect(themeRow?.status).toBe("uncertain");
    expect(themeRow?.reason?.trim().length).toBeGreaterThan(0);
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
  });

  test("rejects missing evidence summary header", () => {
    expect(() =>
      assertBatch013ConvergenceClosureReady(fullBatch013InventoryPassReport()),
    ).toThrow(/batch-013 convergence evidence summary/);
  });

  test("rejects command-path fail output", () => {
    const output = outputWithSummary(`${NEXT_BUILD_REQUIRED_MESSAGE}\n`);

    expect(() => assertBatch013ConvergenceClosureReady(output)).toThrow(
      /command-path pass/,
    );
  });

  test("rejects customer-ask fail rows", () => {
    const output = outputWithSummary(preRepairBatch013InventoryFailReport());

    expect(() => assertBatch013ConvergenceClosureReady(output)).toThrow(
      /no failing customer-ask rows/,
    );
  });

  test("rejects truncated reports that leave missing inventory slots as fail rows", () => {
    const truncatedReport = formatCustomerAskConvergenceReport(
      buildFullBatch013CustomerAskRows().slice(0, 1),
    );
    const output = outputWithSummary(truncatedReport);

    expect(() => assertBatch013ConvergenceClosureReady(output)).toThrow(
      /no failing customer-ask rows/,
    );
  });
});

describe("assertBatch013ConvergencePreRepairEvidence", () => {
  test("accepts failing glossary rows with narrow-repair recommendation", () => {
    const output = outputWithSummary(preRepairBatch013InventoryFailReport());

    const summary = assertBatch013ConvergencePreRepairEvidence(output);
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(
      summary.customerAsk.rows.filter((row) => row.status === "fail").length,
    ).toBeGreaterThan(0);
    expect(
      summary.customerAsk.rows
        .filter((row) => row.status === "fail")
        .every((row) => row.reason?.trim()),
    ).toBe(true);
  });

  test("rejects post-repair stop-and-wait output", () => {
    const output = outputWithSummary(fullBatch013InventoryPassReport());

    expect(() => assertBatch013ConvergencePreRepairEvidence(output)).toThrow(
      /at least one failing batch-013 customer-ask row/,
    );
  });
});

describe("assertBatch013CommandPathFailureIsActionable", () => {
  test("requires specific reason and narrow-repair recommendation", () => {
    const summary = buildPhase1Batch013ConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(() =>
      assertBatch013CommandPathFailureIsActionable(summary),
    ).not.toThrow();
    expect(summary.commandPath.reason).toBe(NEXT_BUILD_REQUIRED_MESSAGE);
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
  });
});

describe("batch-013 closure summary contract", () => {
  test("printed summary header matches planner doc", () => {
    expect(PHASE_1_BATCH_013_CONVERGENCE_EVIDENCE_SUMMARY_HEADER).toBe(
      "Phase 1 batch-013 convergence evidence summary",
    );
  });
});
