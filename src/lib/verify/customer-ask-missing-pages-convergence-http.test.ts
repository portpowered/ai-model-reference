import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  BATCH_012_ATTENTION_SEARCH_QUERY,
  BATCH_012_MISSING_PAGES_CHECKS,
  BATCH_012_MISSING_PAGES_ROUTES,
} from "./batch-012-missing-pages-checks";
import { MISSING_PAGES_CUSTOMER_ASK_REASONS } from "./customer-ask-missing-pages-convergence";
import {
  POST_REPAIR_ATTENTION_MODULE_HTML,
  POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML,
  POST_REPAIR_VECTOR_GLOSSARY_HTML,
  PRE_REPAIR_ATTENTION_WITHOUT_REGISTRY_HTML,
  PRE_REPAIR_MISSING_ROUTE_HTML,
} from "./customer-ask-missing-pages-convergence.test";
import {
  MISSING_PAGES_POST_REPAIR_ATTENTION_API_RESULTS,
  runCustomerAskMissingPagesChecks,
} from "./customer-ask-missing-pages-convergence-http";
import type { SearchSurfaceResultSnapshot } from "./customer-ask-search-surface-convergence";
import { PHASE_1_ATTENTION_MODULE_URL } from "./phase-1-search-checks";

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

function passingSearchSnapshot(): SearchSurfaceResultSnapshot {
  return {
    resultUrls: [
      PHASE_1_ATTENTION_MODULE_URL,
      "/docs/modules/grouped-query-attention",
    ],
    matchedTagsVisible: false,
    hasResults: true,
    hasEmpty: false,
  };
}

function createMissingPagesStubServer(
  htmlByPath: Record<string, string>,
  statusByPath: Record<string, number> = {},
  apiResultsByQuery: Record<string, unknown[]> = {},
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const [path, queryString = ""] = (req.url ?? "/").split("?");
    const status = statusByPath[path] ?? 200;

    if (path === BATCH_012_MISSING_PAGES_ROUTES.searchApi) {
      const params = new URLSearchParams(queryString);
      const query = params.get("query") ?? "";
      const results = apiResultsByQuery[query] ?? [];
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(results));
      return;
    }

    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

describe("runCustomerAskMissingPagesChecks", () => {
  test("returns pass rows when stub server serves post-repair route and search fixtures", async () => {
    const httpServer = createMissingPagesStubServer(
      {
        [BATCH_012_MISSING_PAGES_ROUTES.attentionModule]:
          POST_REPAIR_ATTENTION_MODULE_HTML,
        [BATCH_012_MISSING_PAGES_ROUTES.vectorGlossary]:
          POST_REPAIR_VECTOR_GLOSSARY_HTML,
        [BATCH_012_MISSING_PAGES_ROUTES.hiddenSizeGlossary]:
          POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML,
      },
      {},
      {
        [BATCH_012_ATTENTION_SEARCH_QUERY]:
          MISSING_PAGES_POST_REPAIR_ATTENTION_API_RESULTS,
      },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskMissingPagesChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runSearchAttentionSnapshotProbe: async () => passingSearchSnapshot(),
        },
      );

      expect(rows).toHaveLength(5);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        BATCH_012_MISSING_PAGES_CHECKS.attentionRoute.checkId,
        BATCH_012_MISSING_PAGES_CHECKS.vectorRoute.checkId,
        BATCH_012_MISSING_PAGES_CHECKS.hiddenSizeRoute.checkId,
        BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
        BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
      ]);
      expect(
        rows.filter(
          (row) =>
            row.checkId ===
            BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
        ),
      ).toEqual([
        expect.objectContaining({
          route: BATCH_012_MISSING_PAGES_ROUTES.searchPage,
          query: BATCH_012_ATTENTION_SEARCH_QUERY,
          checklistRow: "phase-1-search-surface",
        }),
        expect.objectContaining({
          route: BATCH_012_MISSING_PAGES_ROUTES.searchApi,
          query: BATCH_012_ATTENTION_SEARCH_QUERY,
          checklistRow: "phase-1-search-surface",
        }),
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair missing routes and fragment search hits", async () => {
    const httpServer = createMissingPagesStubServer(
      {
        [BATCH_012_MISSING_PAGES_ROUTES.attentionModule]:
          PRE_REPAIR_ATTENTION_WITHOUT_REGISTRY_HTML,
        [BATCH_012_MISSING_PAGES_ROUTES.vectorGlossary]:
          PRE_REPAIR_MISSING_ROUTE_HTML,
        [BATCH_012_MISSING_PAGES_ROUTES.hiddenSizeGlossary]:
          PRE_REPAIR_MISSING_ROUTE_HTML,
      },
      {},
      {
        [BATCH_012_ATTENTION_SEARCH_QUERY]: [
          { url: `${PHASE_1_ATTENTION_MODULE_URL}#overview` },
        ],
      },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskMissingPagesChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runSearchAttentionSnapshotProbe: async () => ({
            resultUrls: [`${PHASE_1_ATTENTION_MODULE_URL}#overview`],
            matchedTagsVisible: false,
            hasResults: true,
            hasEmpty: false,
          }),
        },
      );

      const attentionRouteRow = rows.find(
        (row) =>
          row.checkId === BATCH_012_MISSING_PAGES_CHECKS.attentionRoute.checkId,
      );
      const vectorRouteRow = rows.find(
        (row) =>
          row.checkId === BATCH_012_MISSING_PAGES_CHECKS.vectorRoute.checkId,
      );
      const searchRow = rows.find(
        (row) =>
          row.checkId ===
            BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId &&
          row.route === BATCH_012_MISSING_PAGES_ROUTES.searchPage,
      );
      const apiRow = rows.find(
        (row) =>
          row.checkId ===
            BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId &&
          row.route === BATCH_012_MISSING_PAGES_ROUTES.searchApi,
      );

      expect(attentionRouteRow?.status).toBe("fail");
      expect(attentionRouteRow?.reason).toBe(
        MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionRegistry,
      );
      expect(vectorRouteRow?.status).toBe("fail");
      expect(searchRow?.status).toBe("fail");
      expect(searchRow?.reason).toBe("search hit URL includes a hash fragment");
      expect(apiRow?.status).toBe("fail");
      expect(apiRow?.reason).toBe("search hit URL includes a hash fragment");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when built routes are non-200", async () => {
    const httpServer = createMissingPagesStubServer(
      {
        [BATCH_012_MISSING_PAGES_ROUTES.attentionModule]:
          POST_REPAIR_ATTENTION_MODULE_HTML,
        [BATCH_012_MISSING_PAGES_ROUTES.vectorGlossary]:
          POST_REPAIR_VECTOR_GLOSSARY_HTML,
        [BATCH_012_MISSING_PAGES_ROUTES.hiddenSizeGlossary]:
          POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML,
      },
      {
        [BATCH_012_MISSING_PAGES_ROUTES.attentionModule]: 404,
        [BATCH_012_MISSING_PAGES_ROUTES.vectorGlossary]: 500,
        [BATCH_012_MISSING_PAGES_ROUTES.hiddenSizeGlossary]: 404,
      },
      {
        [BATCH_012_ATTENTION_SEARCH_QUERY]:
          MISSING_PAGES_POST_REPAIR_ATTENTION_API_RESULTS,
      },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskMissingPagesChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runSearchAttentionSnapshotProbe: async () => passingSearchSnapshot(),
        },
      );

      const routeRows = rows.slice(0, 3);
      expect(routeRows.every((row) => row.status === "fail")).toBe(true);
      expect(routeRows[0]?.reason).toContain("HTTP 404");
      expect(routeRows[1]?.reason).toContain("HTTP 500");
      expect(routeRows[2]?.reason).toContain("HTTP 404");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
