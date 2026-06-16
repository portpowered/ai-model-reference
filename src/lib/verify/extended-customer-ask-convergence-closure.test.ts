import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  BATCH_012_CUSTOMER_ASK_CHECK_IDS,
  BATCH_012_CUSTOMER_ASK_INVENTORY,
  buildBatch012CustomerAskReportSlots,
} from "./batch-012-customer-ask-check-inventory";
import { runCustomerAskConvergenceChecks } from "./customer-ask-convergence-orchestrator";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
  CUSTOMER_ASK_PASSING_API_RESULTS,
  CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS,
} from "./customer-ask-convergence-stub-fixtures";
import { POST_REPAIR_SEARCH_RESULT_ROW_HTML } from "./customer-ask-search-follow-up-convergence";
import { SEARCH_SURFACE_CUSTOMER_ASK_QUERIES } from "./customer-ask-search-surface-convergence";
import { POST_REPAIR_SEARCH_INLINE_RESULTS_HTML } from "./customer-ask-tag-search-decoration-convergence.test";
import {
  assertBatch012CommandPathFailureIsActionable,
  assertBatch012ConvergenceClosureReady,
  assertBatch012CustomerAskRowsPassOrUncertain,
  assertPhase1CustomerAskRowsPassOrUncertain,
} from "./phase-1-batch-012-convergence-closure";
import {
  buildPhase1Batch012ConvergenceEvidenceSummary,
  formatPhase1Batch012ConvergenceEvidenceSummary,
  PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-batch-012-convergence-evidence";
import {
  buildPhase1CustomerAskReportSlots,
  PHASE_1_CUSTOMER_ASK_CHECK_IDS,
} from "./phase-1-customer-ask-check-inventory";
import { PHASE_1_ATTENTION_MODULE_URL } from "./phase-1-search-checks";
import { NEXT_BUILD_REQUIRED_MESSAGE } from "./server-lifecycle";

function listenOnEphemeralPort(
  httpServer: ReturnType<typeof createHttpServer>,
): Promise<number> {
  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Expected bound TCP port"));
        return;
      }
      resolve(address.port);
    });
  });
}

function createConvergenceStubServer(
  htmlByPath: Record<string, string>,
  apiResultsByQuery: Record<
    string,
    Array<{ url: string }>
  > = CUSTOMER_ASK_PASSING_API_RESULTS,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = requestUrl.pathname;

    if (path === "/api/search") {
      const query = requestUrl.searchParams.get("query") ?? "";
      const hits = apiResultsByQuery[query] ?? [];
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(hits));
      return;
    }

    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

function checklistRowForCheckId(checkId: string): string {
  const inventoryEntry = BATCH_012_CUSTOMER_ASK_INVENTORY.find(
    (entry) => entry.checkId === checkId,
  );
  if (inventoryEntry) {
    return inventoryEntry.checklistRow;
  }

  return "phase-1-stub";
}

function inventoryPassRow(
  checkId: string,
  route?: string,
  query?: string,
): CustomerAskConvergenceRow {
  return {
    checkId,
    title: `${checkId} stub title`,
    status: "pass",
    route,
    query,
    checklistRow: checklistRowForCheckId(checkId),
  };
}

function fullBatch012InventoryPassReport(): string {
  const rows: CustomerAskConvergenceRow[] =
    buildBatch012CustomerAskReportSlots().map((slot) =>
      inventoryPassRow(slot.checkId, slot.route, slot.query),
    );

  return formatCustomerAskConvergenceReport(rows);
}

function outputWithSummary(verifyOutput: string): string {
  const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
    verifyOutput,
  });
  return `${verifyOutput}\n${formatPhase1Batch012ConvergenceEvidenceSummary(summary)}`;
}

function passingBatch012CustomerAskOptions() {
  return {
    timeoutMs: 2_000,
    homeHeaderOptions: {
      runCommandKAffordanceProbe: async () => null,
    },
    mobileHeaderOptions: {
      runMobileHeaderViewportProbe: async () => null,
    },
    searchSurfaceOptions: {
      queries: SEARCH_SURFACE_CUSTOMER_ASK_QUERIES,
      runSearchPageQueryCheck: async () => ({
        resultUrls: ["/docs/modules/grouped-query-attention"],
        matchedTagsVisible: false,
        hasResults: true,
        hasEmpty: false,
        firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
      }),
      runSearchDialogQueryCheck: async () => ({
        resultUrls: ["/docs/modules/grouped-query-attention"],
        matchedTagsVisible: false,
        hasResults: true,
        hasEmpty: false,
        firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
      }),
      fetchApiGqaResults: async () => ({
        results: [
          { url: "/docs/modules/grouped-query-attention" },
          { url: "/docs/glossary/token" },
        ],
      }),
    },
    tagSearchDecorationOptions: {
      runSearchPageResultsHtmlProbe: async (
        _baseUrl: string,
        query: string,
      ) => ({
        html: `<div data-query="${query}">${POST_REPAIR_SEARCH_INLINE_RESULTS_HTML}</div>`,
      }),
    },
    missingPagesOptions: {
      runSearchAttentionSnapshotProbe: async () => ({
        resultUrls: [
          PHASE_1_ATTENTION_MODULE_URL,
          "/docs/modules/grouped-query-attention",
        ],
        matchedTagsVisible: false,
        hasResults: true,
        hasEmpty: false,
      }),
      fetchAttentionApiResults: async () => ({
        results: [
          { url: PHASE_1_ATTENTION_MODULE_URL },
          { url: "/docs/modules/grouped-query-attention" },
        ],
      }),
    },
    docsFooterOptions: {
      readBundledAppCss: () => CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS,
    },
  };
}

describe("batch-012 post-repair inventory coverage", () => {
  test("passing stub bundle yields pass or documented uncertain for every batch-012 inventory row", async () => {
    const httpServer = createConvergenceStubServer(
      CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        passingBatch012CustomerAskOptions(),
      );
      const batch012Rows = rows.slice(-BATCH_012_CUSTOMER_ASK_CHECK_IDS.length);

      const ordered =
        assertBatch012CustomerAskRowsPassOrUncertain(batch012Rows);
      expect(ordered).toHaveLength(BATCH_012_CUSTOMER_ASK_CHECK_IDS.length);
      expect(ordered.some((row) => row.status === "fail")).toBe(false);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("passing stub bundle yields pass or documented uncertain for expanded Phase 1 inventory", async () => {
    const httpServer = createConvergenceStubServer(
      CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        passingBatch012CustomerAskOptions(),
      );

      const ordered = assertPhase1CustomerAskRowsPassOrUncertain(rows);
      expect(ordered).toHaveLength(PHASE_1_CUSTOMER_ASK_CHECK_IDS.length);
      expect(ordered.some((row) => row.status === "fail")).toBe(false);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertBatch012ConvergenceClosureReady", () => {
  test("accepts command-path pass with full inventory and stop-and-wait recommendation", () => {
    const output = outputWithSummary(fullBatch012InventoryPassReport());

    const summary = assertBatch012ConvergenceClosureReady(output);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
  });

  test("accepts uncertain customer-ask rows with stop-and-wait recommendation", () => {
    const passReport = fullBatch012InventoryPassReport();
    const uncertainReport = passReport.replace(
      "[PASS] module.graph-theme-readability",
      "[UNCERTAIN] module.graph-theme-readability — GQA graph readability — theme markers present but contrast not provable in static HTML — checklistRow=phase-1-module-page",
    );
    const output = outputWithSummary(uncertainReport);

    const summary = assertBatch012ConvergenceClosureReady(output);
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
  });

  test("rejects missing evidence summary header", () => {
    expect(() =>
      assertBatch012ConvergenceClosureReady(fullBatch012InventoryPassReport()),
    ).toThrow(/batch-012 convergence evidence summary/);
  });

  test("rejects command-path fail output", () => {
    const output = outputWithSummary(`${NEXT_BUILD_REQUIRED_MESSAGE}\n`);

    expect(() => assertBatch012ConvergenceClosureReady(output)).toThrow(
      /command-path pass/,
    );
  });

  test("rejects customer-ask fail rows", () => {
    const failReport = fullBatch012InventoryPassReport().replace(
      "[PASS] home.mobile-hamburger-menu",
      "[FAIL] home.mobile-hamburger-menu — Mobile hamburger menu — inline full nav still present — checklistRow=phase-1-header-bar",
    );
    const output = outputWithSummary(failReport);

    expect(() => assertBatch012ConvergenceClosureReady(output)).toThrow(
      /no failing customer-ask rows/,
    );
  });

  test("rejects missing inventory checkId rows", () => {
    const truncatedReport = formatCustomerAskConvergenceReport([
      inventoryPassRow(BATCH_012_CUSTOMER_ASK_CHECK_IDS[0] ?? "home.stub"),
    ]);
    const output = outputWithSummary(truncatedReport);

    expect(() => assertBatch012ConvergenceClosureReady(output)).toThrow(
      /Missing customer-ask row for batch-012 inventory slot/,
    );
  });
});

describe("assertBatch012CommandPathFailureIsActionable", () => {
  test("requires specific reason and narrow-repair recommendation", () => {
    const summary = buildPhase1Batch012ConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(() =>
      assertBatch012CommandPathFailureIsActionable(summary),
    ).not.toThrow();
    expect(summary.commandPath.reason).toBe(NEXT_BUILD_REQUIRED_MESSAGE);
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
  });
});

describe("batch-012 closure summary contract", () => {
  test("printed summary header matches planner doc", () => {
    expect(PHASE_1_BATCH_012_CONVERGENCE_EVIDENCE_SUMMARY_HEADER).toBe(
      "Phase 1 batch-012 convergence evidence summary",
    );
  });

  test("expanded Phase 1 inventory includes batch-011 and batch-012 slots", () => {
    expect(buildPhase1CustomerAskReportSlots().length).toBe(
      PHASE_1_CUSTOMER_ASK_CHECK_IDS.length,
    );
  });
});
