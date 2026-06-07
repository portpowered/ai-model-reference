import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  BATCH_013_GLOSSARY_CHECKS,
  BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_013_GLOSSARY_ROUTES,
} from "./batch-013-glossary-checks";
import {
  POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
  POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
  PRE_REPAIR_HIDDEN_SIZE_ROUTE_HTML,
  PRE_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
} from "./batch-013-glossary-page-convergence.test";
import { runBatch013GlossaryRouteChecks } from "./batch-013-glossary-page-convergence-http";
import {
  BATCH_013_ROUTE_CHECKS,
  BATCH_013_ROUTE_PATHS,
} from "./batch-013-route-checks";
import { GLOSSARY_PAGE_CUSTOMER_ASK_REASONS } from "./customer-ask-glossary-page-convergence";
import {
  POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
  POST_REPAIR_TOKEN_GLOSSARY_HTML,
  PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
  PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
} from "./customer-ask-glossary-page-convergence.test";
import {
  POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML,
  POST_REPAIR_VECTOR_GLOSSARY_HTML,
} from "./customer-ask-missing-pages-convergence.test";

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

describe("runBatch013GlossaryRouteChecks", () => {
  test("returns pass rows when stub server serves post-repair glossary HTML", async () => {
    const httpServer = createGlossaryPageStubServer({
      [BATCH_013_GLOSSARY_ROUTES.token]: POST_REPAIR_TOKEN_GLOSSARY_HTML,
      [BATCH_013_GLOSSARY_ROUTES.embedding]:
        POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
      [BATCH_013_GLOSSARY_ROUTES.vector]:
        POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
      [BATCH_013_GLOSSARY_ROUTES.hiddenSize]:
        POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GlossaryRouteChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );

      expect(rows).toHaveLength(7);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES.map(
          () => BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
        ),
        BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
        BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
        BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
      ]);
      expect(
        rows.every((row) => row.checklistRow === "phase-1-glossary-page"),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair opening summary and route regressions", async () => {
    const httpServer = createGlossaryPageStubServer({
      [BATCH_013_GLOSSARY_ROUTES.token]: PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
      [BATCH_013_GLOSSARY_ROUTES.embedding]:
        PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
      [BATCH_013_GLOSSARY_ROUTES.vector]:
        PRE_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
      [BATCH_013_GLOSSARY_ROUTES.hiddenSize]: PRE_REPAIR_HIDDEN_SIZE_ROUTE_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GlossaryRouteChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );

      const tokenOpeningRow = rows.find(
        (row) => row.route === BATCH_013_GLOSSARY_ROUTES.token,
      );
      const embeddingRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      );
      const vectorOpeningRow = rows.find(
        (row) =>
          row.route === BATCH_013_GLOSSARY_ROUTES.vector &&
          row.checkId ===
            BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      );
      const hiddenSizeRouteRow = rows.find(
        (row) => row.checkId === BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
      );

      expect(tokenOpeningRow?.status).toBe("fail");
      expect(tokenOpeningRow?.reason).toBe(
        GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening,
      );
      expect(embeddingRow?.status).toBe("fail");
      expect(embeddingRow?.reason).toBe(
        GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingEmbeddingVectorLink,
      );
      expect(vectorOpeningRow?.status).toBe("fail");
      expect(hiddenSizeRouteRow?.status).toBe("fail");
      expect(hiddenSizeRouteRow?.route).toBe(
        BATCH_013_ROUTE_PATHS.hiddenSizeGlossary,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when glossary routes are non-200", async () => {
    const httpServer = createGlossaryPageStubServer(
      {
        [BATCH_013_GLOSSARY_ROUTES.token]: POST_REPAIR_TOKEN_GLOSSARY_HTML,
        [BATCH_013_GLOSSARY_ROUTES.embedding]:
          POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
        [BATCH_013_GLOSSARY_ROUTES.vector]: POST_REPAIR_VECTOR_GLOSSARY_HTML,
        [BATCH_013_GLOSSARY_ROUTES.hiddenSize]:
          POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML,
      },
      {
        [BATCH_013_GLOSSARY_ROUTES.vector]: 404,
        [BATCH_013_GLOSSARY_ROUTES.hiddenSize]: 500,
      },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GlossaryRouteChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );

      const vectorOpeningRow = rows.find(
        (row) =>
          row.route === BATCH_013_GLOSSARY_ROUTES.vector &&
          row.checkId ===
            BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      );
      const vectorRouteRow = rows.find(
        (row) => row.checkId === BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
      );
      const hiddenSizeOpeningRow = rows.find(
        (row) =>
          row.route === BATCH_013_GLOSSARY_ROUTES.hiddenSize &&
          row.checkId ===
            BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      );
      const hiddenSizeRouteRow = rows.find(
        (row) => row.checkId === BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
      );

      expect(vectorOpeningRow?.status).toBe("fail");
      expect(vectorOpeningRow?.reason).toContain("HTTP 404");
      expect(vectorRouteRow?.status).toBe("fail");
      expect(vectorRouteRow?.reason).toContain("HTTP 404");
      expect(hiddenSizeOpeningRow?.status).toBe("fail");
      expect(hiddenSizeOpeningRow?.reason).toContain("HTTP 500");
      expect(hiddenSizeRouteRow?.status).toBe("fail");
      expect(hiddenSizeRouteRow?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
