import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  HOME_HEADER_CUSTOMER_ASK_CHECKS,
  HOME_HEADER_CUSTOMER_ASK_REASONS,
} from "./customer-ask-home-header-convergence";
import { runCustomerAskHomeHeaderChecks } from "./customer-ask-home-header-convergence-http";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "./home-search-entry-convergence";

const HEADER_SEARCH_TRIGGER = `
  <button data-search="" aria-label="Open search" class="group">
    <span>Search</span>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">⌘</kbd>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">K</kbd>
  </button>
`;

const POST_REPAIR_HOME_HTML = `
  <header>
    <nav aria-label="Primary">
      <a href="/">Home</a>
      <a href="/docs/architecture">Architecture</a>
      <a href="/docs/glossary">Glossary</a>
      <a href="/tags">Tags</a>
    </nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Model Atlas intro without inline search handoff.</p>
    </article>
  </main>
`;

const PRE_REPAIR_HOME_HTML = `
  <header>
    <nav aria-label="Primary">
      <a href="/">Home</a>
      <a href="/search">Search</a>
    </nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <section id="search" aria-labelledby="home-search-heading">
        <h2 id="home-search-heading">${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2>
        <input data-search="" aria-label="Search Model Atlas" />
      </section>
    </article>
  </main>
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

function createHomeStubServer(
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

describe("runCustomerAskHomeHeaderChecks", () => {
  test("returns all pass rows when stub server serves post-repair home HTML", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${POST_REPAIR_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeHeaderChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry.checkId,
        HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch.checkId,
        HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance.checkId,
        HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair inline search and duplicate nav link", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${PRE_REPAIR_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeHeaderChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const headerRow = rows.find(
        (row) =>
          row.checkId ===
          HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry.checkId,
      );
      const navRow = rows.find(
        (row) =>
          row.checkId ===
          HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch.checkId,
      );

      expect(headerRow?.status).toBe("fail");
      expect(navRow?.status).toBe("fail");
      expect(navRow?.reason).toBe(
        HOME_HEADER_CUSTOMER_ASK_REASONS.redundantPrimaryNavSearchLink,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("upgrades command-k affordance to pass when Playwright probe succeeds", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${POST_REPAIR_HOME_HTML.replace(/<kbd[\s\S]*?<\/kbd>/g, "")}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeHeaderChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runCommandKAffordanceProbe: async () => null,
        },
      );
      const affordanceRow = rows.find(
        (row) =>
          row.checkId ===
          HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance.checkId,
      );
      expect(affordanceRow?.status).toBe("pass");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when home route is non-200", async () => {
    const httpServer = createHomeStubServer(
      { "/": `<html>${POST_REPAIR_HOME_HTML}</html>` },
      { "/": 500 },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeHeaderChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(
        rows.every(
          (row) => row.status === "fail" || row.status === "uncertain",
        ),
      ).toBe(true);
      expect(rows[0]?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
