import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  HOME_SEARCH_ENTRY_CONVERGENCE_REASONS,
  REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE,
} from "./home-search-entry-convergence";
import {
  assertHomeSearchEntryConvergenceRoute,
  formatHomeSearchEntryConvergenceCheckFailure,
  HOME_SEARCH_ENTRY_CONVERGENCE_PATH,
  runHomeSearchEntryConvergenceChecks,
} from "./home-search-entry-convergence-http";

const HEADER_SEARCH_TRIGGER =
  '<button data-search="" aria-label="Open search">Search</button>';

const POST_DEDUP_HOME_HTML = `
  <header>
    <nav aria-label="Primary">Model Atlas</nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Use the header search.
        <a href="/search">Search entry page</a>
      </p>
    </article>
  </main>
`;

const PRE_REPAIR_HOME_HTML = `
  <header>
    <nav aria-label="Primary">Model Atlas</nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <section id="search" aria-labelledby="home-search-heading">
        <h2 id="home-search-heading">${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2>
        <input data-search="" aria-label="Search Model Atlas" />
      </section>
      <a href="/search">Search entry page</a>
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

describe("HOME_SEARCH_ENTRY_CONVERGENCE_PATH", () => {
  test("targets the Phase 1 home route", () => {
    expect(HOME_SEARCH_ENTRY_CONVERGENCE_PATH).toBe("/");
  });
});

describe("runHomeSearchEntryConvergenceChecks", () => {
  test("returns no failures when stub server serves post-dedup home HTML", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${POST_DEDUP_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runHomeSearchEntryConvergenceChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports pre-repair home HTML with request URL and stable reason", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${PRE_REPAIR_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runHomeSearchEntryConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
      });

      const failure = failures[0];
      expect(failures).toEqual([
        {
          url: `${baseUrl}/`,
          route: "/",
          status: 200,
          reason:
            HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchHeading,
        },
      ]);
      expect(failure).toBeDefined();
      if (!failure) {
        throw new Error("expected a home search entry convergence failure");
      }
      expect(formatHomeSearchEntryConvergenceCheckFailure(failure)).toBe(
        `${baseUrl}/: HTTP 200 — ${HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchHeading}`,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports non-200 responses with request URL", async () => {
    const httpServer = createHomeStubServer(
      { "/": `<html>${POST_DEDUP_HOME_HTML}</html>` },
      { "/": 500 },
    );
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runHomeSearchEntryConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
      });

      expect(failures[0]?.url).toBe(`${baseUrl}/`);
      expect(failures[0]?.reason).toBe("expected HTTP 200");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertHomeSearchEntryConvergenceRoute", () => {
  test("prints the failing URL and home search reason to stderr before exit", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${PRE_REPAIR_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;
    const stderrLines: string[] = [];
    const originalStderr = console.error;

    console.error = (...args: unknown[]) => {
      stderrLines.push(args.map(String).join(" "));
    };

    try {
      await expect(
        assertHomeSearchEntryConvergenceRoute(baseUrl, { timeoutMs: 2_000 }),
      ).rejects.toThrow(
        "Phase 1 home search entry convergence verification failed",
      );

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/`);
      expect(stderr).toContain(
        HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchHeading,
      );
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
