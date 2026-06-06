import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { DOCS_SHELL_CONVERGENCE_REASONS } from "./docs-shell-convergence";
import {
  assertDocsShellConvergenceRoutes,
  DOCS_SHELL_CONVERGENCE_ROUTES,
  formatDocsShellConvergenceCheckFailure,
  runDocsShellConvergenceChecks,
} from "./docs-shell-convergence-http";

const UNIFIED_SHELL_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <div id="nd-sidebar">
    <span>Modules</span>
    <span>Glossary</span>
    <a href="${TOKEN_GLOSSARY_URL}">Token</a>
  </div>
  <div id="nd-page"><article>Docs content</article></div>
`;

const SPLIT_SHELL_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <aside aria-label="Docs sidebar">
    <p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p>
  </aside>
  <article>Index content without Fumadocs regions</article>
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

function createDocsShellStubServer(
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

function passingHtmlByPath(): Record<string, string> {
  return Object.fromEntries(
    DOCS_SHELL_CONVERGENCE_ROUTES.map((route) => [
      route.path,
      `<html>${UNIFIED_SHELL_HTML}</html>`,
    ]),
  );
}

describe("DOCS_SHELL_CONVERGENCE_ROUTES", () => {
  test("covers all Phase 1 docs-like shell convergence routes", () => {
    expect(DOCS_SHELL_CONVERGENCE_ROUTES.map((route) => route.path)).toEqual([
      "/docs/architecture",
      "/docs/glossary",
      "/docs/glossary/token",
      "/docs/glossary/vector",
      "/docs/glossary/hidden-size",
      "/docs/modules/attention",
      "/docs/modules/grouped-query-attention",
    ]);
  });
});

describe("runDocsShellConvergenceChecks", () => {
  test("returns no failures when stub server serves unified shell HTML", async () => {
    const httpServer = createDocsShellStubServer(passingHtmlByPath());
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runDocsShellConvergenceChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports split-shell HTML with request URL and stable reason", async () => {
    const httpServer = createDocsShellStubServer({
      ...passingHtmlByPath(),
      "/docs/architecture": `<html>${SPLIT_SHELL_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runDocsShellConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
        routes: DOCS_SHELL_CONVERGENCE_ROUTES.filter(
          (route) => route.path === "/docs/architecture",
        ),
      });

      const failure = failures[0];
      expect(failures).toEqual([
        {
          url: `${baseUrl}/docs/architecture`,
          route: "/docs/architecture",
          status: 200,
          reason: DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar,
        },
      ]);
      expect(failure).toBeDefined();
      if (!failure) {
        throw new Error("expected a shell convergence failure");
      }
      expect(formatDocsShellConvergenceCheckFailure(failure)).toBe(
        `${baseUrl}/docs/architecture: HTTP 200 — ${DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar}`,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("stops at the first failing docs route", async () => {
    const httpServer = createDocsShellStubServer({
      ...passingHtmlByPath(),
      "/docs/architecture": `<html>${SPLIT_SHELL_HTML}</html>`,
      "/docs/glossary": `<html>${SPLIT_SHELL_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runDocsShellConvergenceChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toHaveLength(1);
      expect(failures[0]?.route).toBe("/docs/architecture");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports non-200 responses with request URL", async () => {
    const httpServer = createDocsShellStubServer(passingHtmlByPath(), {
      "/docs/glossary": 500,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runDocsShellConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
        routes: DOCS_SHELL_CONVERGENCE_ROUTES.filter(
          (route) => route.path === "/docs/glossary",
        ),
      });

      expect(failures[0]?.url).toBe(`${baseUrl}/docs/glossary`);
      expect(failures[0]?.reason).toBe("expected HTTP 200");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertDocsShellConvergenceRoutes", () => {
  test("prints the first failing URL and shell reason to stderr before exit", async () => {
    const httpServer = createDocsShellStubServer({
      ...passingHtmlByPath(),
      "/docs/modules/grouped-query-attention": `<html>${SPLIT_SHELL_HTML}</html>`,
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
        assertDocsShellConvergenceRoutes(baseUrl, { timeoutMs: 2_000 }),
      ).rejects.toThrow("Phase 1 docs shell convergence verification failed");

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(
        `${baseUrl}/docs/modules/grouped-query-attention`,
      );
      expect(stderr).toContain(DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar);
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
