import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  CUSTOMER_ASK_PASSING_EMBEDDING_GLOSSARY_HTML,
  CUSTOMER_ASK_PASSING_HIDDEN_SIZE_GLOSSARY_HTML,
  CUSTOMER_ASK_PASSING_VECTOR_GLOSSARY_HTML,
} from "./customer-ask-convergence-stub-fixtures";
import {
  GLOSSARY_CUSTOMER_ASK_CHECKS,
  GLOSSARY_CUSTOMER_ASK_REASONS,
  GLOSSARY_CUSTOMER_ASK_ROUTE,
  GLOSSARY_EMBEDDING_ROUTE,
  GLOSSARY_HIDDEN_SIZE_ROUTE,
  GLOSSARY_VECTOR_ROUTE,
} from "./customer-ask-glossary-convergence";
import { runCustomerAskGlossaryChecks } from "./customer-ask-glossary-convergence-http";

const CHROME_LINK_CLASS =
  'class="no-underline transition-colors hover:no-underline focus-visible:ring-2"';

const PROSE_AUTO_LINK_CLASS = CHROME_LINK_CLASS;

const FOOTER_CONTRACT_HTML = `
  <div class="@container grid gap-4 grid-cols-2">
    <a class="flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground" href="/docs/glossary/scaling-law">
      <div class="inline-flex items-center gap-1.5 font-medium"><p>Scaling Law</p></div>
      <p class="text-fd-muted-foreground truncate">Previous Page</p>
    </a>
    <a class="flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground text-end" href="/docs/concepts/embedding">
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
          <li><a href="/docs/concepts/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
        </ul>
      </article>
      ${FOOTER_CONTRACT_HTML}
    </div>
  </html>
`;

const POST_REPAIR_EMBEDDING_HTML = `
  <html>
    <h1>Embedding</h1>
    <p class="mb-8 text-lg text-fd-muted-foreground">
      A <a href="/docs/glossary/vector" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>dense vector</a> that represents a <a href="/docs/glossary/token" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token</a> or other discrete item so the model can run continuous math on it.
    </p>
    <article data-registry-id="concept.embedding">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
  </html>
`;

const POST_REPAIR_VECTOR_HTML = `
  <html>
    <h1>Vector</h1>
    <p class="mb-8 text-lg text-fd-muted-foreground">
      An ordered list of numbers that represents a point or direction in continuous space—<a href="/docs/concepts/embedding" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>embeddings</a> and activations are vectors at different stages of the model.
    </p>
    <article data-registry-id="concept.vector">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
  </html>
`;

const POST_REPAIR_HIDDEN_SIZE_HTML = `
  <html>
    <h1>Hidden Size</h1>
    <p class="mb-8 text-lg text-fd-muted-foreground">
      The width of a model's internal <a href="/docs/glossary/vector" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>vectors</a>—the number of dimensions in each <a href="/docs/concepts/embedding" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token embedding</a> and each <a href="/docs/glossary/token" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token</a>'s per-position hidden state before the vocabulary projection.
    </p>
    <article data-registry-id="concept.hidden-size">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
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
        <li><a href="/docs/concepts/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
    </article>
  </html>
`;

const POST_REPAIR_STUB_HTML_BY_PATH: Record<string, string> = {
  [GLOSSARY_CUSTOMER_ASK_ROUTE]: POST_REPAIR_GLOSSARY_HTML,
  [GLOSSARY_EMBEDDING_ROUTE]: POST_REPAIR_EMBEDDING_HTML,
  [GLOSSARY_VECTOR_ROUTE]: POST_REPAIR_VECTOR_HTML,
  [GLOSSARY_HIDDEN_SIZE_ROUTE]: POST_REPAIR_HIDDEN_SIZE_HTML,
};

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

const EXPECTED_CHECK_IDS = [
  GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
  GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
  GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
  GLOSSARY_CUSTOMER_ASK_CHECKS.embeddingDescriptionLinks.checkId,
  GLOSSARY_CUSTOMER_ASK_CHECKS.vectorDescriptionLinks.checkId,
  GLOSSARY_CUSTOMER_ASK_CHECKS.hiddenSizeDescriptionLinks.checkId,
];

describe("runCustomerAskGlossaryChecks", () => {
  test("returns all pass rows when stub server serves post-repair glossary HTML", async () => {
    const httpServer = createGlossaryStubServer(POST_REPAIR_STUB_HTML_BY_PATH);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(6);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual(EXPECTED_CHECK_IDS);
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
              <li><a href="/docs/concepts/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
            </ul>
          </article>
          <a href="/docs/concepts/embedding"><span>Previous</span><p>Embedding</p></a>
          <p class="text-fd-muted-foreground truncate">Next Page</p>
        </div>
      </html>
    `;
    const httpServer = createGlossaryStubServer({
      ...POST_REPAIR_STUB_HTML_BY_PATH,
      [GLOSSARY_CUSTOMER_ASK_ROUTE]: html,
    });
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

  test("reports fail evidence for pre-repair rendered opening summary", async () => {
    const html = `
      <html>
        <h1>Token</h1>
        <article data-registry-id="concept.token">
          <p data-testid="glossary-opening">Summary</p>
          <ul data-testid="tag-pill-list" aria-label="Tags">
            <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
          </ul>
          <ul data-testid="curated-related-docs">
            <li><a href="/docs/concepts/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
          </ul>
        </article>
      </html>
    `;
    const httpServer = createGlossaryStubServer({
      ...POST_REPAIR_STUB_HTML_BY_PATH,
      [GLOSSARY_CUSTOMER_ASK_ROUTE]: html,
    });
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

      expect(presentationRow?.status).toBe("fail");
      expect(presentationRow?.reason).toBe(
        GLOSSARY_CUSTOMER_ASK_REASONS.renderedOpeningSummary,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair where-it-appears and underline chrome", async () => {
    const httpServer = createGlossaryStubServer({
      ...POST_REPAIR_STUB_HTML_BY_PATH,
      [GLOSSARY_CUSTOMER_ASK_ROUTE]: PRE_REPAIR_GLOSSARY_HTML,
    });
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

  test("reports fail evidence when embedding shell description lacks vector link", async () => {
    const html = POST_REPAIR_EMBEDDING_HTML.replace(
      'href="/docs/glossary/vector"',
      'href="/docs/glossary/missing"',
    );
    const httpServer = createGlossaryStubServer({
      ...POST_REPAIR_STUB_HTML_BY_PATH,
      [GLOSSARY_EMBEDDING_ROUTE]: html,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const embeddingRow = rows.find(
        (row) =>
          row.checkId ===
          GLOSSARY_CUSTOMER_ASK_CHECKS.embeddingDescriptionLinks.checkId,
      );

      expect(embeddingRow?.status).toBe("fail");
      expect(embeddingRow?.reason).toContain("/docs/glossary/vector");
      expect(embeddingRow?.route).toBe(GLOSSARY_EMBEDDING_ROUTE);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when glossary token route is non-200", async () => {
    const httpServer = createGlossaryStubServer(POST_REPAIR_STUB_HTML_BY_PATH, {
      [GLOSSARY_CUSTOMER_ASK_ROUTE]: 500,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const tokenRows = rows.slice(0, 3);
      expect(tokenRows.every((row) => row.status === "fail")).toBe(true);
      expect(tokenRows[0]?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when bridge glossary route is non-200", async () => {
    const httpServer = createGlossaryStubServer(POST_REPAIR_STUB_HTML_BY_PATH, {
      [GLOSSARY_VECTOR_ROUTE]: 404,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const bridgeRows = rows.slice(3);
      expect(bridgeRows.every((row) => row.status === "fail")).toBe(true);
      expect(bridgeRows[0]?.reason).toContain("HTTP 404");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("passes with shared customer-ask bridge glossary stub fixtures", async () => {
    const httpServer = createGlossaryStubServer({
      [GLOSSARY_CUSTOMER_ASK_ROUTE]: POST_REPAIR_GLOSSARY_HTML,
      [GLOSSARY_EMBEDDING_ROUTE]: CUSTOMER_ASK_PASSING_EMBEDDING_GLOSSARY_HTML,
      [GLOSSARY_VECTOR_ROUTE]: CUSTOMER_ASK_PASSING_VECTOR_GLOSSARY_HTML,
      [GLOSSARY_HIDDEN_SIZE_ROUTE]:
        CUSTOMER_ASK_PASSING_HIDDEN_SIZE_GLOSSARY_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskGlossaryChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const bridgeRows = rows.slice(3);
      expect(bridgeRows.every((row) => row.status === "pass")).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
