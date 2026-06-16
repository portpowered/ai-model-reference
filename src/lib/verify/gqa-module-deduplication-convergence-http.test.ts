import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { BATCH_013_GQA_MODULE_CHECKS } from "./batch-013-gqa-module-checks";
import { runBatch013GqaModuleDeduplicationChecks } from "./batch-013-gqa-module-deduplication-convergence-http";
import {
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
  GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS,
} from "./customer-ask-gqa-module-deduplication-convergence";
import { POST_REPAIR_BATCH_013_GQA_MODULE_HTML } from "./gqa-module-deduplication-convergence.test";
import { GROUPED_QUERY_ATTENTION_MODULE_TITLE } from "./grouped-query-attention-module-convergence";

const PRE_REPAIR_BATCH_013_COMBINED_MODULE_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
      <section aria-label="Module metadata"><p>Registry metadata</p></section>
      <section aria-label="At a glance"><p>At a glance</p></section>
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
    </article>
  </html>
`;

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

function createGqaModuleStubServer(
  html: string,
  status = 200,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    if (path !== GQA_MODULE_CUSTOMER_ASK_ROUTE) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html>not found</html>");
      return;
    }

    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
}

describe("runBatch013GqaModuleDeduplicationChecks", () => {
  test("returns all pass rows when stub server serves post-repair GQA module HTML", async () => {
    const httpServer = createGqaModuleStubServer(
      POST_REPAIR_BATCH_013_GQA_MODULE_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GqaModuleDeduplicationChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
        BATCH_013_GQA_MODULE_CHECKS.noMetadataCard.checkId,
        BATCH_013_GQA_MODULE_CHECKS.singleTagList.checkId,
      ]);
      expect(
        rows.every((row) => row.checklistRow === "phase-1-module-page"),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair duplicate heading, metadata card, and tag lists", async () => {
    const httpServer = createGqaModuleStubServer(
      PRE_REPAIR_BATCH_013_COMBINED_MODULE_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GqaModuleDeduplicationChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );

      const duplicateHeadingRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      );
      const metadataRow = rows.find(
        (row) =>
          row.checkId === BATCH_013_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      );
      const tagListRow = rows.find(
        (row) =>
          row.checkId === BATCH_013_GQA_MODULE_CHECKS.singleTagList.checkId,
      );

      expect(duplicateHeadingRow?.status).toBe("fail");
      expect(duplicateHeadingRow?.reason).toBe(
        GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateBodyHeading,
      );
      expect(metadataRow?.status).toBe("fail");
      expect(metadataRow?.reason).toBe(
        GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.moduleMetadataCard,
      );
      expect(tagListRow?.status).toBe("fail");
      expect(tagListRow?.reason).toBe(
        GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateTagPillList,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when GQA module route is non-200", async () => {
    const httpServer = createGqaModuleStubServer(
      POST_REPAIR_BATCH_013_GQA_MODULE_HTML,
      500,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GqaModuleDeduplicationChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.status === "fail")).toBe(true);
      expect(rows[0]?.reason).toContain("HTTP 500");
      expect(rows[0]?.route).toBe(GQA_MODULE_CUSTOMER_ASK_ROUTE);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
