import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS,
  BATCH_011_FOLLOW_UP_HOME_ROUTE,
  BATCH_011_FOLLOW_UP_NAV_ROUTE,
} from "./batch-011-follow-up-home-nav-checks";
import { HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS } from "./customer-ask-home-nav-follow-up-convergence";
import { runCustomerAskHomeNavFollowUpChecks } from "./customer-ask-home-nav-follow-up-convergence-http";

const POST_REPAIR_HOME_BODY = `
  <header>
    <nav aria-label="Primary"><a href="/">Home</a></nav>
    <button data-search="" aria-label="Open search"><kbd>⌘</kbd><kbd>K</kbd></button>
  </header>
  <main>
    <article>
      <header class="relative overflow-hidden rounded-lg px-6 py-10">
        <h1>Model Atlas</h1>
      </header>
      <section id="browse" aria-labelledby="home-browse-heading">
        <h2 id="home-browse-heading">Browse</h2>
        <ul class="mt-4 flex list-none flex-col gap-3" aria-label="Browse">
          <li><a href="/tags" class="no-underline hover:no-underline">Tags</a></li>
        </ul>
      </section>
    </article>
  </main>
`;

const PRE_REPAIR_HOME_BODY = `
  <header>
    <nav aria-label="Primary"><a href="/">Home</a></nav>
    <button data-search="" aria-label="Open search"><kbd>⌘</kbd><kbd>K</kbd></button>
  </header>
  <main>
    <article>
      <header class="relative mb-8 overflow-hidden rounded-lg px-6 py-10">
        <h1>Model Atlas</h1>
      </header>
      <section id="browse" aria-labelledby="home-browse-heading">
        <h2 id="home-browse-heading">Browse</h2>
        <ul class="mt-4 flex list-disc flex-col gap-3" aria-label="Browse">
          <li><a href="/tags" class="underline hover:underline">Tags</a></li>
        </ul>
      </section>
    </article>
  </main>
`;

const POST_REPAIR_NAV_BODY = `
  <div id="nd-sidebar" aria-label="Docs sidebar">
    <a href="/docs/glossary/token">Token</a>
  </div>
  <div id="nd-page"><article>GQA module</article></div>
`;

const PRE_REPAIR_NAV_BODY = `
  <div id="nd-sidebar" aria-label="Docs sidebar">
    <button data-theme-toggle="" aria-label="Toggle Theme">Theme</button>
  </div>
  <div id="nd-page"><article>GQA module</article></div>
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

function createStubServer(
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

describe("runCustomerAskHomeNavFollowUpChecks", () => {
  test("returns all pass rows when stub server serves post-repair home and nav routes", async () => {
    const httpServer = createStubServer({
      [BATCH_011_FOLLOW_UP_HOME_ROUTE]: `<html>${POST_REPAIR_HOME_BODY}</html>`,
      [BATCH_011_FOLLOW_UP_NAV_ROUTE]: `<html>${POST_REPAIR_NAV_BODY}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeNavFollowUpChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity.checkId,
        BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks.checkId,
        BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.checkId,
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair home brevity and browse-link regressions", async () => {
    const httpServer = createStubServer({
      [BATCH_011_FOLLOW_UP_HOME_ROUTE]: `<html>${PRE_REPAIR_HOME_BODY}</html>`,
      [BATCH_011_FOLLOW_UP_NAV_ROUTE]: `<html>${POST_REPAIR_NAV_BODY}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeNavFollowUpChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const brevityRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity.checkId,
      );
      const browseRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks.checkId,
      );

      expect(brevityRow?.status).toBe("fail");
      expect(brevityRow?.reason).toBe(
        HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.excessBrushHeaderMargin,
      );
      expect(browseRow?.status).toBe("fail");
      expect(browseRow?.reason).toBe(
        HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.browseListDisc,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence when docs sidebar still exposes theme toggle", async () => {
    const httpServer = createStubServer({
      [BATCH_011_FOLLOW_UP_HOME_ROUTE]: `<html>${POST_REPAIR_HOME_BODY}</html>`,
      [BATCH_011_FOLLOW_UP_NAV_ROUTE]: `<html>${PRE_REPAIR_NAV_BODY}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeNavFollowUpChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const navRow = rows.find(
        (row) =>
          row.checkId ===
          BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.checkId,
      );
      expect(navRow?.status).toBe("fail");
      expect(navRow?.reason).toBe(
        HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.brokenThemeTogglePresent,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when home route is non-200", async () => {
    const httpServer = createStubServer(
      {
        [BATCH_011_FOLLOW_UP_HOME_ROUTE]: `<html>${POST_REPAIR_HOME_BODY}</html>`,
        [BATCH_011_FOLLOW_UP_NAV_ROUTE]: `<html>${POST_REPAIR_NAV_BODY}</html>`,
      },
      { [BATCH_011_FOLLOW_UP_HOME_ROUTE]: 500 },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskHomeNavFollowUpChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const homeRows = rows.filter(
        (row) => row.route === BATCH_011_FOLLOW_UP_HOME_ROUTE,
      );
      expect(homeRows.every((row) => row.status === "fail")).toBe(true);
      expect(homeRows[0]?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
