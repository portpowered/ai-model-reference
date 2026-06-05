import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  GQA_MODULE_CUSTOMER_ASK_CHECKS,
  GQA_MODULE_CUSTOMER_ASK_REASONS,
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-gqa-module-convergence";
import { runCustomerAskGqaModuleChecks } from "./customer-ask-gqa-module-convergence-http";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";

const POST_REPAIR_MODULE_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="module.grouped-query-attention"></div>
    ${buildGroupedQueryAttentionStubBody()}
    <section aria-label="Architecture">
      <ul class="list-none">
        <li><a href="/docs/modules/multi-query-attention">MQA</a></li>
      </ul>
    </section>
    <ul data-testid="tag-pill-list" aria-label="Tags">
      <li><a href="/tags/attention">Attention</a></li>
    </ul>
  </html>
`;

const PRE_REPAIR_MODULE_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="module.grouped-query-attention"></div>
    <h2>Variants And Nearby Modules</h2>
    <section aria-label="Architecture">
      <ul class="list-disc">
        <li><a href="/docs/modules/multi-query-attention">MQA</a></li>
      </ul>
    </section>
    <a href="/docs/modules/multi-head-attention">Multi-Head Attention</a>
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

describe("runCustomerAskGqaModuleChecks", () => {
  test("returns all pass rows when stub server serves post-repair GQA module HTML", async () => {
    const httpServer = createGqaModuleStubServer(POST_REPAIR_MODULE_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGqaModuleChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        GQA_MODULE_CUSTOMER_ASK_CHECKS.presentation.checkId,
        GQA_MODULE_CUSTOMER_ASK_CHECKS.listDisc.checkId,
        GQA_MODULE_CUSTOMER_ASK_CHECKS.mhaGqaComparison.checkId,
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair variants, list-disc, and implicit prose", async () => {
    const httpServer = createGqaModuleStubServer(PRE_REPAIR_MODULE_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGqaModuleChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const presentationRow = rows.find(
        (row) =>
          row.checkId === GQA_MODULE_CUSTOMER_ASK_CHECKS.presentation.checkId,
      );
      const listDiscRow = rows.find(
        (row) =>
          row.checkId === GQA_MODULE_CUSTOMER_ASK_CHECKS.listDisc.checkId,
      );
      const comparisonRow = rows.find(
        (row) =>
          row.checkId ===
          GQA_MODULE_CUSTOMER_ASK_CHECKS.mhaGqaComparison.checkId,
      );

      expect(presentationRow?.status).toBe("fail");
      expect(presentationRow?.reason).toBe(
        GQA_MODULE_CUSTOMER_ASK_REASONS.variantsSection,
      );
      expect(listDiscRow?.status).toBe("fail");
      expect(listDiscRow?.reason).toBe(
        GQA_MODULE_CUSTOMER_ASK_REASONS.nonProseListDisc,
      );
      expect(comparisonRow?.status).toBe("fail");
      expect(comparisonRow?.reason).toBe(
        GQA_MODULE_CUSTOMER_ASK_REASONS.implicitProseComparison,
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
      const rows = await runCustomerAskGqaModuleChecks(
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
