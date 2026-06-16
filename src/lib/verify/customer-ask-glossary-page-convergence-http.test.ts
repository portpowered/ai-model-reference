import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  BATCH_012_GLOSSARY_CHECKS,
  BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_012_GLOSSARY_ROUTES,
} from "./batch-012-glossary-checks";
import { GLOSSARY_PAGE_CUSTOMER_ASK_REASONS } from "./customer-ask-glossary-page-convergence";
import {
  POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
  POST_REPAIR_TOKEN_GLOSSARY_HTML,
  PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
  PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
} from "./customer-ask-glossary-page-convergence.test";
import { runCustomerAskGlossaryPageChecks } from "./customer-ask-glossary-page-convergence-http";
import {
  POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
  POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
} from "./glossary-page-convergence.test";

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

function createGlossaryPageStubServer(
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

const POST_REPAIR_GLOSSARY_HTML_BY_ROUTE = {
  [BATCH_012_GLOSSARY_ROUTES.token]: POST_REPAIR_TOKEN_GLOSSARY_HTML,
  [BATCH_012_GLOSSARY_ROUTES.embedding]: POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
  [BATCH_012_GLOSSARY_ROUTES.vector]: POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
  [BATCH_012_GLOSSARY_ROUTES.hiddenSize]:
    POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
} as const;

describe("runCustomerAskGlossaryPageChecks", () => {
  test("returns pass rows when stub server serves post-repair glossary HTML", async () => {
    const httpServer = createGlossaryPageStubServer({
      ...POST_REPAIR_GLOSSARY_HTML_BY_ROUTE,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryPageChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );

      expect(rows).toHaveLength(5);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        ...BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES.map(
          () => BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
        ),
        BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      ]);
      expect(rows.map((row) => row.route)).toEqual([
        ...BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES,
        BATCH_012_GLOSSARY_ROUTES.embedding,
      ]);
      expect(
        rows.every((row) => row.checklistRow === "phase-1-glossary-page"),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair opening summary and plain description", async () => {
    const httpServer = createGlossaryPageStubServer({
      [BATCH_012_GLOSSARY_ROUTES.token]: PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
      [BATCH_012_GLOSSARY_ROUTES.embedding]:
        PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
      [BATCH_012_GLOSSARY_ROUTES.vector]:
        POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
      [BATCH_012_GLOSSARY_ROUTES.hiddenSize]:
        POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryPageChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );

      const openingRow = rows.find(
        (row) =>
          row.checkId ===
            BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId &&
          row.route === BATCH_012_GLOSSARY_ROUTES.token,
      );
      const embeddingRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      );

      expect(openingRow?.status).toBe("fail");
      expect(openingRow?.reason).toBe(
        GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening,
      );
      expect(embeddingRow?.status).toBe("fail");
      expect(embeddingRow?.reason).toBe(
        GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingEmbeddingVectorLink,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when glossary routes are non-200", async () => {
    const httpServer = createGlossaryPageStubServer(
      POST_REPAIR_GLOSSARY_HTML_BY_ROUTE,
      {
        [BATCH_012_GLOSSARY_ROUTES.token]: 500,
        [BATCH_012_GLOSSARY_ROUTES.embedding]: 404,
      },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryPageChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );

      expect(rows).toHaveLength(5);
      expect(rows.every((row) => row.status === "fail")).toBe(false);
      const tokenRow = rows.find(
        (row) => row.route === BATCH_012_GLOSSARY_ROUTES.token,
      );
      const embeddingOpeningRow = rows.find(
        (row) =>
          row.route === BATCH_012_GLOSSARY_ROUTES.embedding &&
          row.checkId ===
            BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      );
      const embeddingLinksRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      );

      expect(tokenRow?.reason).toContain("HTTP 500");
      expect(embeddingOpeningRow?.reason).toContain("HTTP 404");
      expect(embeddingLinksRow?.reason).toContain("HTTP 404");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
