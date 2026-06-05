import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS,
  DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-docs-footer-convergence";
import { runCustomerAskDocsFooterChecks } from "./customer-ask-docs-footer-convergence-http";

const PASSING_BUNDLED_FOOTER_CSS = `
  #nd-page a[class*=hover\\:bg-fd-accent][class*=hover\\:text-fd-accent-foreground]:is(:hover,:focus-visible)>p.text-fd-muted-foreground{color:inherit}
`;

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
      ${FOOTER_CONTRACT_HTML}
    </div>
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

function createDocsFooterStubServer(
  html: string,
  status = 200,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    if (path !== DOCS_FOOTER_CUSTOMER_ASK_ROUTE) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html>not found</html>");
      return;
    }

    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
}

describe("runCustomerAskDocsFooterChecks", () => {
  test("returns pass row when stub server serves footer HTML and bundled CSS passes", async () => {
    const httpServer = createDocsFooterStubServer(POST_REPAIR_GLOSSARY_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskDocsFooterChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          readBundledAppCss: () => PASSING_BUNDLED_FOOTER_CSS,
        },
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("pass");
      expect(rows[0]?.checkId).toBe(
        DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence when bundled CSS lacks the inherit rule", async () => {
    const httpServer = createDocsFooterStubServer(POST_REPAIR_GLOSSARY_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskDocsFooterChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          readBundledAppCss: () =>
            "#nd-page a:hover>p.text-fd-muted-foreground{color:var(--color-fd-muted-foreground)}",
        },
      );

      expect(rows[0]?.status).toBe("fail");
      expect(rows[0]?.reason).toContain(
        "missing footer sublabel hover/focus inherit",
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure row when docs footer route is non-200", async () => {
    const httpServer = createDocsFooterStubServer(
      POST_REPAIR_GLOSSARY_HTML,
      500,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskDocsFooterChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          readBundledAppCss: () => PASSING_BUNDLED_FOOTER_CSS,
        },
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("fail");
      expect(rows[0]?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
