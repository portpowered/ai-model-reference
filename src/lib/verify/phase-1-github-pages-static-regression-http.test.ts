import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  STATIC_REGRESSION_CHECKS,
  STATIC_REGRESSION_QUERIES,
} from "./phase-1-github-pages-static-regression";
import { runPhase1GitHubPagesStaticRegressionChecks } from "./phase-1-github-pages-static-regression-http";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

const GQA_URL = PHASE_1_GROUPED_QUERY_ATTENTION_URL;

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

const POST_REPAIR_HOME_BODY = `
  <header>
    <button data-search="" aria-label="Open search">Search</button>
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
    </article>
  </main>
`;

describe("runPhase1GitHubPagesStaticRegressionChecks", () => {
  test("returns all pass rows when injected probes and route HTML are post-repair", async () => {
    const rows = await runPhase1GitHubPagesStaticRegressionChecks(
      "http://127.0.0.1:3200",
      {
        queries: STATIC_REGRESSION_QUERIES,
        runSearchPageQueryCheck: async () => ({
          resultUrls: [GQA_URL, "/docs/glossary/token"],
          matchedTagsVisible: false,
          hasResults: true,
          hasEmpty: false,
        }),
        runSearchDialogQueryCheck: async () => ({
          resultUrls: [GQA_URL],
          matchedTagsVisible: false,
          hasResults: true,
          hasEmpty: false,
        }),
        fetchHomeHtml: async () => POST_REPAIR_HOME_BODY,
        fetchGqaModuleHtml: async () =>
          `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
      },
    );

    expect(rows).toHaveLength(14);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.filter(
        (row) =>
          row.checkId ===
          STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
      ),
    ).toHaveLength(3);
  });

  test("reports fragment and matched-tag fail evidence from injected probes", async () => {
    const rows = await runPhase1GitHubPagesStaticRegressionChecks(
      "http://127.0.0.1:3200",
      {
        queries: ["attention"],
        runSearchPageQueryCheck: async () => ({
          resultUrls: [`${GQA_URL}#compute-flow`],
          matchedTagsVisible: true,
          hasResults: true,
          hasEmpty: false,
        }),
        runSearchDialogQueryCheck: async () => ({
          resultUrls: [GQA_URL],
          matchedTagsVisible: false,
          hasResults: true,
          hasEmpty: false,
        }),
        fetchHomeHtml: async () => POST_REPAIR_HOME_BODY,
        fetchGqaModuleHtml: async () =>
          `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
      },
    );

    const pageHits = rows.find(
      (row) =>
        row.checkId ===
        STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
    );
    const pageMatchedTags = rows.find(
      (row) =>
        row.checkId ===
        STATIC_REGRESSION_CHECKS.searchPageNoMatchedTags.checkId,
    );

    expect(pageHits?.status).toBe("fail");
    expect(pageMatchedTags?.status).toBe("fail");
  });

  test("fetches home and GQA module HTML from a static HTTP fixture server", async () => {
    const httpServer = createHttpServer((req, res) => {
      const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(POST_REPAIR_HOME_BODY);
        return;
      }
      if (requestUrl.pathname === GQA_URL) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
        );
        return;
      }
      res.writeHead(404);
      res.end("not found");
    });

    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const rows = await runPhase1GitHubPagesStaticRegressionChecks(baseUrl, {
        queries: ["GQA"],
        runSearchPageQueryCheck: async () => ({
          resultUrls: [GQA_URL],
          matchedTagsVisible: false,
          hasResults: true,
          hasEmpty: false,
        }),
        runSearchDialogQueryCheck: async () => ({
          resultUrls: [GQA_URL],
          matchedTagsVisible: false,
          hasResults: true,
          hasEmpty: false,
        }),
      });

      const homeRow = rows.find(
        (row) =>
          row.checkId ===
          STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.checkId,
      );
      const gqaRow = rows.find(
        (row) =>
          row.checkId ===
          STATIC_REGRESSION_CHECKS.gqaModulePresentation.checkId,
      );

      expect(homeRow?.status).toBe("pass");
      expect(gqaRow?.status).toBe("pass");
    } finally {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
