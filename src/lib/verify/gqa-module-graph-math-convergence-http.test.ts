import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { BATCH_013_GQA_MODULE_CHECKS } from "./batch-013-gqa-module-checks";
import { runBatch013GqaModuleGraphMathChecks } from "./batch-013-gqa-module-graph-math-convergence-http";
import { GQA_MODULE_CUSTOMER_ASK_ROUTE } from "./customer-ask-gqa-module-deduplication-convergence";
import {
  GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS,
  GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
} from "./customer-ask-gqa-module-graph-math-convergence";
import {
  POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
  PRE_REPAIR_BATCH_013_DUPLICATE_GRAPH_HTML,
  PRE_REPAIR_BATCH_013_MISSING_MATH_DEFINITIONS_HTML,
  PRE_REPAIR_BATCH_013_MISSING_THEME_HTML,
} from "./gqa-module-graph-math-convergence.test";

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

describe("runBatch013GqaModuleGraphMathChecks", () => {
  test("returns uncertain graph-theme row and pass rows for post-repair HTML", async () => {
    const httpServer = createGqaModuleStubServer(
      POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GqaModuleGraphMathChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.checkId)).toEqual([
        BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
        BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
        BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      ]);

      const themeRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      );
      expect(themeRow?.status).toBe("uncertain");
      expect(themeRow?.reason).toContain(
        GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
      );
      expect(
        rows.filter((row) => row.status === "pass").map((row) => row.checkId),
      ).toEqual([
        BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
        BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      ]);
      expect(
        rows.every((row) => row.checklistRow === "phase-1-module-page"),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for missing theme markers, duplicate graphs, and missing math definitions", async () => {
    const httpServer = createGqaModuleStubServer(
      PRE_REPAIR_BATCH_013_MISSING_THEME_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const missingThemeRows = await runBatch013GqaModuleGraphMathChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(
        missingThemeRows.find(
          (row) =>
            row.checkId ===
            BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
        )?.status,
      ).toBe("fail");
      expect(
        missingThemeRows.find(
          (row) =>
            row.checkId ===
            BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
        )?.reason,
      ).toBe(
        GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingThemedNodeColors,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }

    const duplicateGraphServer = createGqaModuleStubServer(
      PRE_REPAIR_BATCH_013_DUPLICATE_GRAPH_HTML,
    );
    const duplicateGraphPort =
      await listenOnEphemeralPort(duplicateGraphServer);

    try {
      const duplicateGraphRows = await runBatch013GqaModuleGraphMathChecks(
        `http://127.0.0.1:${duplicateGraphPort}`,
        { timeoutMs: 2_000 },
      );
      expect(
        duplicateGraphRows.find(
          (row) =>
            row.checkId ===
            BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
        )?.reason,
      ).toBe(
        GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.duplicateReactFlowGraph,
      );
    } finally {
      duplicateGraphServer.closeAllConnections();
      duplicateGraphServer.close();
    }

    const missingMathServer = createGqaModuleStubServer(
      PRE_REPAIR_BATCH_013_MISSING_MATH_DEFINITIONS_HTML,
    );
    const missingMathPort = await listenOnEphemeralPort(missingMathServer);

    try {
      const missingMathRows = await runBatch013GqaModuleGraphMathChecks(
        `http://127.0.0.1:${missingMathPort}`,
        { timeoutMs: 2_000 },
      );
      expect(
        missingMathRows.find(
          (row) =>
            row.checkId ===
            BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
        )?.reason,
      ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingMathDefinitions);
    } finally {
      missingMathServer.closeAllConnections();
      missingMathServer.close();
    }
  });

  test("returns HTTP failure rows when GQA module route is non-200", async () => {
    const httpServer = createGqaModuleStubServer(
      POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
      500,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runBatch013GqaModuleGraphMathChecks(
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
