import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { BATCH_012_TAG_SEARCH_DECORATION_CHECKS } from "./batch-012-tag-search-decoration-checks";
import { TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS } from "./customer-ask-tag-search-decoration-convergence";
import {
  POST_REPAIR_ATTENTION_RESOURCE_LINK_HTML,
  POST_REPAIR_SEARCH_INLINE_RESULTS_HTML,
  POST_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML,
  PRE_REPAIR_SEARCH_INLINE_RESULTS_HTML,
  PRE_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML,
} from "./customer-ask-tag-search-decoration-convergence.test";
import { runCustomerAskTagSearchDecorationChecks } from "./customer-ask-tag-search-decoration-convergence-http";

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

function createTagSearchStubServer(
  htmlByPath: Record<string, string>,
  statusByPath: Record<string, number> = {},
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    const status = statusByPath[path] ?? 200;
    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

describe("runCustomerAskTagSearchDecorationChecks", () => {
  test("returns pass rows when stub server serves post-repair tag and search HTML", async () => {
    const httpServer = createTagSearchStubServer({
      "/tags": `<html>${POST_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML}</html>`,
      "/tags/attention": `<html>${POST_REPAIR_ATTENTION_RESOURCE_LINK_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskTagSearchDecorationChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runSearchPageResultsHtmlProbe: async (_baseUrl, query) => ({
            html: `<div data-query="${query}">${POST_REPAIR_SEARCH_INLINE_RESULTS_HTML}</div>`,
          }),
        },
      );

      const resourceRows = rows.filter(
        (row) =>
          row.checkId ===
          BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline
            .checkId,
      );
      expect(resourceRows).toHaveLength(2);
      expect(resourceRows.every((row) => row.status === "pass")).toBe(true);
      expect(
        resourceRows.every((row) => row.checklistRow === "phase-1-tags-page"),
      ).toBe(true);

      const searchRows = rows.filter(
        (row) =>
          row.checkId ===
          BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration
            .checkId,
      );
      expect(searchRows).toHaveLength(3);
      expect(searchRows.every((row) => row.status === "pass")).toBe(true);
      expect(
        searchRows.every(
          (row) => row.checklistRow === "phase-1-search-surface",
        ),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair tag resource underline HTML", async () => {
    const httpServer = createTagSearchStubServer({
      "/tags": `<html>${PRE_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML}</html>`,
      "/tags/attention": `<html>${POST_REPAIR_ATTENTION_RESOURCE_LINK_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskTagSearchDecorationChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runSearchPageResultsHtmlProbe: async () => ({
            html: `<div>${POST_REPAIR_SEARCH_INLINE_RESULTS_HTML}</div>`,
          }),
        },
      );

      const tagsRow = rows.find(
        (row) =>
          row.route === "/tags" &&
          row.checkId ===
            BATCH_012_TAG_SEARCH_DECORATION_CHECKS
              .resourceLinkNoBlanketUnderline.checkId,
      );
      expect(tagsRow?.status).toBe("fail");
      expect(tagsRow?.reason).toBe(
        TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.blanketResourceLinkUnderline,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair search inline list-disc HTML", async () => {
    const httpServer = createTagSearchStubServer({
      "/tags": `<html>${POST_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML}</html>`,
      "/tags/attention": `<html>${POST_REPAIR_ATTENTION_RESOURCE_LINK_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskTagSearchDecorationChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runSearchPageResultsHtmlProbe: async (_baseUrl, query) => ({
            html:
              query === "GQA"
                ? `<div>${PRE_REPAIR_SEARCH_INLINE_RESULTS_HTML}</div>`
                : `<div>${POST_REPAIR_SEARCH_INLINE_RESULTS_HTML}</div>`,
          }),
        },
      );

      const gqaRow = rows.find(
        (row) =>
          row.query === "GQA" &&
          row.checkId ===
            BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration
              .checkId,
      );
      expect(gqaRow?.status).toBe("fail");
      expect(gqaRow?.reason).toBe(
        TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.searchInlineListDecoration,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when tag routes are non-200", async () => {
    const httpServer = createTagSearchStubServer(
      {
        "/tags": `<html>${POST_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML}</html>`,
        "/tags/attention": `<html>${POST_REPAIR_ATTENTION_RESOURCE_LINK_HTML}</html>`,
      },
      { "/tags": 500 },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskTagSearchDecorationChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runSearchPageResultsHtmlProbe: async () => ({
            html: `<div>${POST_REPAIR_SEARCH_INLINE_RESULTS_HTML}</div>`,
          }),
        },
      );

      const tagsRow = rows.find((row) => row.route === "/tags");
      expect(tagsRow?.status).toBe("fail");
      expect(tagsRow?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
