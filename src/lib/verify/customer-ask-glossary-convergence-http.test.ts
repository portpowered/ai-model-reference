import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  GLOSSARY_CUSTOMER_ASK_CHECKS,
  GLOSSARY_CUSTOMER_ASK_REASONS,
  GLOSSARY_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-glossary-convergence";
import { runCustomerAskGlossaryChecks } from "./customer-ask-glossary-convergence-http";

const CHROME_LINK_CLASS =
  'class="no-underline transition-colors hover:no-underline focus-visible:ring-2"';

const FOOTER_CONTRACT_HTML = `
  <div class="@container grid gap-4 grid-cols-2">
    <a class="flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground" href="/docs/glossary/scaling-law">
      <div class="inline-flex items-center gap-1.5 font-medium"><p>Scaling Law</p></div>
      <p class="text-fd-muted-foreground truncate">Previous Page</p>
    </a>
    <a class="flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground text-end" href="/docs/glossary/embedding">
      <div class="inline-flex items-center gap-1.5 font-medium flex-row-reverse"><p>Embedding</p></div>
      <p class="text-fd-muted-foreground truncate">Next Page</p>
    </a>
  </div>
`;

const POST_REPAIR_GLOSSARY_HTML = `
  <html>
    <div id="nd-page">
      <h1>Token</h1>
      <article data-registry-id="concept.token">
        <ul data-testid="tag-pill-list" aria-label="Tags">
          <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
        </ul>
        <ul data-testid="curated-related-docs">
          <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
        </ul>
      </article>
      ${FOOTER_CONTRACT_HTML}
    </div>
  </html>
`;

const PRE_REPAIR_GLOSSARY_HTML = `
  <html>
    <h1>Token</h1>
    <article data-registry-id="concept.token">
      <section id="where-it-appears"><h2>Where It Appears</h2></section>
      <p data-testid="glossary-opening">Summary</p>
      <ul data-testid="tag-pill-list" aria-label="Tags">
        <li><a href="/tags/attention" class="underline">Attention</a></li>
      </ul>
      <ul data-testid="curated-related-docs">
        <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
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

function createGlossaryStubServer(
  html: string,
  status = 200,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    if (path !== GLOSSARY_CUSTOMER_ASK_ROUTE) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html>not found</html>");
      return;
    }

    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
}

describe("runCustomerAskGlossaryChecks", () => {
  test("returns all pass rows when stub server serves post-repair glossary HTML", async () => {
    const httpServer = createGlossaryStubServer(POST_REPAIR_GLOSSARY_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
        GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
        GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for footer hover contract violations", async () => {
    const html = `
      <html>
        <div id="nd-page">
          <article data-registry-id="concept.token">
            <p data-testid="glossary-opening">Summary</p>
            <ul data-testid="tag-pill-list" aria-label="Tags">
              <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
            </ul>
            <ul data-testid="curated-related-docs">
              <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
            </ul>
          </article>
          <a href="/docs/glossary/embedding"><span>Previous</span><p>Embedding</p></a>
          <p class="text-fd-muted-foreground truncate">Next Page</p>
        </div>
      </html>
    `;
    const httpServer = createGlossaryStubServer(html);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const footerRow = rows.find(
        (row) =>
          row.checkId === GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
      );

      expect(footerRow?.status).toBe("fail");
      expect(footerRow?.reason).toContain("Previous Page");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair where-it-appears and underline chrome", async () => {
    const httpServer = createGlossaryStubServer(PRE_REPAIR_GLOSSARY_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const presentationRow = rows.find(
        (row) =>
          row.checkId === GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
      );
      const chromeRow = rows.find(
        (row) =>
          row.checkId === GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
      );

      expect(presentationRow?.status).toBe("fail");
      expect(presentationRow?.reason).toBe(
        GLOSSARY_CUSTOMER_ASK_REASONS.whereItAppears,
      );
      expect(chromeRow?.status).toBe("fail");
      expect(chromeRow?.reason).toBe(
        GLOSSARY_CUSTOMER_ASK_REASONS.chromeUnderline,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when glossary route is non-200", async () => {
    const httpServer = createGlossaryStubServer(POST_REPAIR_GLOSSARY_HTML, 500);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
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
