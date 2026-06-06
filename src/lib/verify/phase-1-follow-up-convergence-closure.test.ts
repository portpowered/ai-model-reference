import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS,
  BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY,
  buildBatch011FollowUpCustomerAskReportSlots,
} from "./batch-011-follow-up-customer-ask-check-inventory";
import { BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS } from "./batch-011-follow-up-home-nav-checks";
import { BATCH_011_FOLLOW_UP_SEARCH_CHECKS } from "./batch-011-follow-up-search-checks";
import { runCustomerAskConvergenceChecks } from "./customer-ask-convergence-orchestrator";
import { formatCustomerAskConvergenceReport } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
  CUSTOMER_ASK_PASSING_API_RESULTS,
  CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS,
  CUSTOMER_ASK_PRE_REPAIR_HOME_BREVITY_HTML,
  CUSTOMER_ASK_PRE_REPAIR_TAGS_INDEX_HTML,
  PRE_REPAIR_SEARCH_RESULT_ROW_HTML,
} from "./customer-ask-convergence-stub-fixtures";
import { buildCustomerAskHomeFollowUpRows } from "./customer-ask-home-nav-follow-up-convergence";
import {
  buildCustomerAskSearchPageFollowUpRowsForQuery,
  POST_REPAIR_SEARCH_RESULT_ROW_HTML,
} from "./customer-ask-search-follow-up-convergence";
import type { SearchSurfaceResultSnapshot } from "./customer-ask-search-surface-convergence";
import {
  buildCustomerAskTagListRowsForRoute,
  TAG_LIST_CUSTOMER_ASK_CHECKS,
  TAG_LIST_CUSTOMER_ASK_ROUTES,
} from "./customer-ask-tag-list-convergence";
import {
  assertBatch011FollowUpCommandPathFailureIsActionable,
  assertBatch011FollowUpConvergenceClosureReady,
  assertBatch011FollowUpCustomerAskRowsPassOrUncertain,
} from "./phase-1-follow-up-convergence-closure";
import {
  buildPhase1FollowUpConvergenceEvidenceSummary,
  formatPhase1FollowUpConvergenceEvidenceSummary,
  PHASE_1_BATCH_011_FOLLOW_UP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
} from "./phase-1-follow-up-convergence-evidence";
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
  const inventoryEntry = BATCH_011_FOLLOW_UP_CUSTOMER_ASK_INVENTORY.find(
    (entry) => entry.checkId === checkId,
  );
  if (inventoryEntry) {
    return inventoryEntry.checklistRow;
  }

  return "phase-1-stub";
}

function inventoryPassRow(
  checkId: string,
  query?: string,
): CustomerAskConvergenceRow {
  return {
    checkId,
    title: `${checkId} stub title`,
    status: "pass",
    route: "/",
    query,
    checklistRow: checklistRowForCheckId(checkId),
  };
}

function fullInventoryPassReport(): string {
  const rows: CustomerAskConvergenceRow[] =
    buildBatch011FollowUpCustomerAskReportSlots().map((slot) =>
      inventoryPassRow(slot.checkId, slot.query),
    );

  return formatCustomerAskConvergenceReport(rows);
}

function outputWithSummary(verifyOutput: string): string {
  const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
    verifyOutput,
  });
  return `${verifyOutput}\n${formatPhase1FollowUpConvergenceEvidenceSummary(summary)}`;
}

function preRepairSearchSnapshot(): SearchSurfaceResultSnapshot {
  return {
    resultUrls: ["/docs/modules/grouped-query-attention"],
    matchedTagsVisible: false,
    hasResults: true,
    hasEmpty: false,
    firstResultRowHtml: PRE_REPAIR_SEARCH_RESULT_ROW_HTML,
  };
}

describe("batch-011 follow-up fail-before row builders", () => {
  test("home brevity pre-repair stub fails with human-readable reason", () => {
    const rows = buildCustomerAskHomeFollowUpRows(
      CUSTOMER_ASK_PRE_REPAIR_HOME_BREVITY_HTML,
    );
    const brevityRow = rows.find(
      (row) =>
        row.checkId === BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity.checkId,
    );

    expect(brevityRow?.status).toBe("fail");
    expect(brevityRow?.reason).toContain("excess bottom margin");
  });

  test("search row pre-repair stub fails hover and contrast checks", () => {
    const rows = buildCustomerAskSearchPageFollowUpRowsForQuery(
      preRepairSearchSnapshot(),
      "GQA",
    );

    expect(
      rows.find(
        (row) =>
          row.checkId ===
          BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence.checkId,
      )?.status,
    ).toBe("fail");
    expect(
      rows.find(
        (row) =>
          row.checkId ===
          BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast
            .checkId,
      )?.status,
    ).toBe("fail");
    expect(rows.some((row) => row.reason && row.reason.length > 0)).toBe(true);
  });

  test("reused tag list pre-repair stub fails grouped-list spacing", () => {
    const rows = buildCustomerAskTagListRowsForRoute(
      CUSTOMER_ASK_PRE_REPAIR_TAGS_INDEX_HTML,
      TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
    );
    const spacingRow = rows.find(
      (row) =>
        row.checkId === TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
    );

    expect(spacingRow?.status).toBe("fail");
    expect(spacingRow?.reason).toContain("mt-8");
  });
});

describe("batch-011 follow-up post-repair inventory coverage", () => {
  test("passing stub bundle yields pass or documented uncertain for every inventory row", async () => {
    const httpServer = createConvergenceStubServer(
      CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          homeHeaderOptions: {
            runCommandKAffordanceProbe: async () => null,
          },
          searchSurfaceOptions: {
            queries: ["GQA", "attention", "KV cache"],
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
          docsFooterOptions: {
            readBundledAppCss: () => CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS,
          },
        },
      );

      const ordered =
        assertBatch011FollowUpCustomerAskRowsPassOrUncertain(rows);
      expect(ordered).toHaveLength(
        BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS.length,
      );
      expect(ordered.every((row) => row.status === "pass")).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertBatch011FollowUpConvergenceClosureReady", () => {
  test("accepts command-path pass with full inventory and stop-and-wait recommendation", () => {
    const output = outputWithSummary(fullInventoryPassReport());

    const summary = assertBatch011FollowUpConvergenceClosureReady(output);
    expect(summary.commandPath.status).toBe("pass");
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
  });

  test("accepts uncertain customer-ask rows with stop-and-wait recommendation", () => {
    const passReport = fullInventoryPassReport();
    const uncertainReport = passReport.replace(
      "[PASS] glossary.footer-hover",
      "[UNCERTAIN] glossary.footer-hover — Glossary footer hover — footer nav present but hover pairing not observable in built HTML — checklistRow=phase-1-glossary-page",
    );
    const output = outputWithSummary(uncertainReport);

    const summary = assertBatch011FollowUpConvergenceClosureReady(output);
    expect(summary.recommendation).toBe("stop-and-wait-for-phase-advancement");
  });

  test("rejects missing evidence summary header", () => {
    expect(() =>
      assertBatch011FollowUpConvergenceClosureReady(fullInventoryPassReport()),
    ).toThrow(/batch-011 follow-up convergence evidence summary/);
  });

  test("rejects command-path fail output", () => {
    const output = outputWithSummary(`${NEXT_BUILD_REQUIRED_MESSAGE}\n`);

    expect(() => assertBatch011FollowUpConvergenceClosureReady(output)).toThrow(
      /command-path pass/,
    );
  });

  test("rejects customer-ask fail rows", () => {
    const failReport = fullInventoryPassReport().replace(
      "[PASS] home.brevity",
      "[FAIL] home.brevity — Home page brevity — home brush header still carries excess bottom margin — checklistRow=phase-1-home-header-polish",
    );
    const output = outputWithSummary(failReport);

    expect(() => assertBatch011FollowUpConvergenceClosureReady(output)).toThrow(
      /no failing customer-ask rows/,
    );
  });

  test("rejects missing inventory checkId rows", () => {
    const truncatedReport = formatCustomerAskConvergenceReport([
      inventoryPassRow(
        BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS[0] ?? "home.stub",
      ),
    ]);
    const output = outputWithSummary(truncatedReport);

    expect(() => assertBatch011FollowUpConvergenceClosureReady(output)).toThrow(
      /Missing customer-ask row for batch-011 inventory slot/,
    );
  });
});

describe("assertBatch011FollowUpCommandPathFailureIsActionable", () => {
  test("requires specific reason and narrow-repair recommendation", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: `${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
      customerAskRows: [],
    });

    expect(() =>
      assertBatch011FollowUpCommandPathFailureIsActionable(summary),
    ).not.toThrow();
    expect(summary.commandPath.reason).toBe(NEXT_BUILD_REQUIRED_MESSAGE);
    expect(summary.recommendation).toBe("queue-one-narrow-repair-batch");
  });

  test("ignores passing command-path summaries", () => {
    const summary = buildPhase1FollowUpConvergenceEvidenceSummary({
      verifyOutput: fullInventoryPassReport(),
    });

    expect(() =>
      assertBatch011FollowUpCommandPathFailureIsActionable(summary),
    ).not.toThrow();
  });
});

describe("batch-011 follow-up closure summary contract", () => {
  test("printed summary header matches planner doc", () => {
    expect(
      PHASE_1_BATCH_011_FOLLOW_UP_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    ).toBe("Phase 1 batch-011 follow-up convergence evidence summary");
  });
});
