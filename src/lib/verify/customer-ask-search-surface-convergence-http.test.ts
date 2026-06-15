import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { BATCH_011_FOLLOW_UP_SEARCH_CHECKS } from "./batch-011-follow-up-search-checks";
import { POST_REPAIR_SEARCH_RESULT_ROW_HTML } from "./customer-ask-search-follow-up-convergence";
import {
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKS,
  SEARCH_SURFACE_CUSTOMER_ASK_REASONS,
} from "./customer-ask-search-surface-convergence";
import { runCustomerAskSearchSurfaceChecks } from "./customer-ask-search-surface-convergence-http";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

const GQA_URL = PHASE_1_GROUPED_QUERY_ATTENTION_URL;
const TOKEN_URL = "/docs/glossary/token";

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

function createApiStubServer(
  resultsByQuery: Record<string, Array<{ url: string }>>,
  statusByQuery: Record<string, number> = {},
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const query = requestUrl.searchParams.get("query") ?? "";
    const status = statusByQuery[query] ?? 200;
    const hits = resultsByQuery[query] ?? [];
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(hits));
  });
}

describe("runCustomerAskSearchSurfaceChecks", () => {
  test("returns all pass rows when injected probes and API results are post-repair", async () => {
    const rows = await runCustomerAskSearchSurfaceChecks(
      "http://127.0.0.1:3200",
      {
        queries: ["GQA"],
        runSearchPageQueryCheck: async () => ({
          resultUrls: [GQA_URL, TOKEN_URL],
          matchedTagsVisible: false,
          hasResults: true,
          hasEmpty: false,
          firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
        }),
        runSearchDialogQueryCheck: async () => ({
          resultUrls: [GQA_URL],
          matchedTagsVisible: false,
          hasResults: true,
          hasEmpty: false,
          firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
        }),
        fetchApiGqaResults: async () => ({
          results: [{ url: GQA_URL }, { url: TOKEN_URL }],
        }),
      },
    );

    expect(rows).toHaveLength(8);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(rows.map((row) => row.checkId)).toEqual([
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast
        .checkId,
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogRowHoverCoherence.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogMatchedTextSelectionContrast
        .checkId,
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
    ]);
  });

  test("reports fragment and matched-tag fail evidence from injected probes", async () => {
    const rows = await runCustomerAskSearchSurfaceChecks(
      "http://127.0.0.1:3200",
      {
        queries: ["attention"],
        runSearchPageQueryCheck: async () => ({
          resultUrls: [`${GQA_URL}#compute-flow`],
          matchedTagsVisible: true,
          hasResults: true,
          hasEmpty: false,
          firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
        }),
        runSearchDialogQueryCheck: async () => ({
          resultUrls: [GQA_URL],
          matchedTagsVisible: true,
          hasResults: true,
          hasEmpty: false,
          firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
        }),
        fetchApiGqaResults: async () => ({
          results: [{ url: `${GQA_URL}#overview` }],
        }),
      },
    );

    const pageHits = rows.find(
      (row) =>
        row.checkId ===
        SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
    );
    const pageTags = rows.find(
      (row) =>
        row.checkId ===
        SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
    );
    const dialogTags = rows.find(
      (row) =>
        row.checkId ===
        SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
    );
    const apiRow = rows.find(
      (row) =>
        row.checkId ===
        SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
    );

    expect(pageHits?.status).toBe("fail");
    expect(pageHits?.reason).toBe(
      SEARCH_SURFACE_CUSTOMER_ASK_REASONS.firstResultFragment,
    );
    expect(pageTags?.status).toBe("fail");
    expect(pageTags?.reason).toBe(
      SEARCH_SURFACE_CUSTOMER_ASK_REASONS.matchedTagsVisible,
    );
    expect(dialogTags?.status).toBe("fail");
    expect(apiRow?.status).toBe("fail");
    expect(apiRow?.reason).toBe(
      SEARCH_SURFACE_CUSTOMER_ASK_REASONS.apiGqaFragmentSpam,
    );
  });

  test("reports API HTTP failures on the GQA row", async () => {
    const httpServer = createApiStubServer(
      { GQA: [{ url: GQA_URL }] },
      { GQA: 503 },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskSearchSurfaceChecks(
        `http://127.0.0.1:${port}`,
        {
          queries: [],
          runSearchPageQueryCheck: async () => ({
            resultUrls: [],
            matchedTagsVisible: false,
            hasResults: false,
            hasEmpty: false,
          }),
          runSearchDialogQueryCheck: async () => ({
            resultUrls: [],
            matchedTagsVisible: false,
            hasResults: false,
            hasEmpty: false,
          }),
        },
      );

      const apiRow = rows.find(
        (row) =>
          row.checkId ===
          SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit.checkId,
      );
      expect(apiRow?.status).toBe("fail");
      expect(apiRow?.reason).toContain("HTTP 503");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
