import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { BATCH_012_GQA_MODULE_CHECKS } from "./batch-012-gqa-module-checks";
import { GQA_MODULE_CUSTOMER_ASK_ROUTE } from "./customer-ask-gqa-module-deduplication-convergence";
import {
  GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS,
  GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
} from "./customer-ask-gqa-module-graph-math-convergence";
import { runCustomerAskGqaModuleGraphMathChecks } from "./customer-ask-gqa-module-graph-math-convergence-http";
import {
  buildGroupedQueryAttentionMathComparisonStub,
  buildGroupedQueryAttentionStubBody,
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
} from "./grouped-query-attention-module-convergence";

const POST_REPAIR_STUB_BODY = buildGroupedQueryAttentionStubBody().replace(
  /<ul data-testid="tag-pill-list"[^>]*><\/ul>/,
  "",
);

const POST_REPAIR_MODULE_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        ${POST_REPAIR_STUB_BODY}
      </section>
      <section id="math-or-compute-schema">
        ${buildGroupedQueryAttentionMathComparisonStub()}
      </section>
    </article>
  </html>
`;

const PRE_REPAIR_MODULE_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-flow"></div>
      </section>
      <section id="math-or-compute-schema">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-schema"></div>
        <div data-attention-schema-comparison="true"></div>
      </section>
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

describe("runCustomerAskGqaModuleGraphMathChecks", () => {
  test("returns uncertain graph-theme row and pass rows for post-repair HTML", async () => {
    const httpServer = createGqaModuleStubServer(POST_REPAIR_MODULE_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGqaModuleGraphMathChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.checkId)).toEqual([
        BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
        BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
        BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      ]);

      const themeRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      );
      expect(themeRow?.status).toBe("uncertain");
      expect(themeRow?.reason).toContain(
        GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
      );
      expect(
        rows.filter((row) => row.status === "pass").map((row) => row.checkId),
      ).toEqual([
        BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
        BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for duplicate graphs and missing theme markers", async () => {
    const httpServer = createGqaModuleStubServer(PRE_REPAIR_MODULE_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGqaModuleGraphMathChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const themeRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      );
      const duplicateGraphRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      );
      const mathRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      );

      expect(themeRow?.status).toBe("fail");
      expect(themeRow?.reason).toBe(
        GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingThemedNodeColors,
      );
      expect(duplicateGraphRow?.status).toBe("fail");
      expect(duplicateGraphRow?.reason).toBe(
        GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.duplicateReactFlowGraph,
      );
      expect(mathRow?.status).toBe("fail");
      expect(mathRow?.reason).toBe(
        GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingMathDefinitions,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when GQA module route is non-200", async () => {
    const httpServer = createGqaModuleStubServer(POST_REPAIR_MODULE_HTML, 500);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGqaModuleGraphMathChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.status === "fail")).toBe(true);
      expect(rows[0]?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
