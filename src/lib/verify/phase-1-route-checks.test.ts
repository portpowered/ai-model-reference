import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  buildGroupedQueryAttentionStubBody,
  GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS,
} from "./grouped-query-attention-module-convergence";
import {
  assertPhase1Routes,
  formatPhase1RouteCheckFailure,
  PHASE_1_ROUTE_ASSERTIONS,
  runPhase1RouteChecks,
} from "./phase-1-route-checks";

const PASSING_STUB_HTML: Record<string, string> = {
  "/": "<html><title>Model Atlas</title></html>",
  "/search": "<html><h1>Search</h1></html>",
  "/docs/architecture": "<html><h1>Architecture</h1><p>Token</p></html>",
  "/docs/glossary": "<html><h1>Glossary</h1><p>Token</p></html>",
  "/tags": '<html><h1>Tags</h1><a href="/tags/attention">Attention</a></html>',
  "/tags/attention":
    '<html><h1>Attention</h1><a href="/docs/modules/grouped-query-attention">GQA</a><a href="/docs/glossary/token">Token</a><a href="/search?tag=attention">Search</a></html>',
  "/docs/glossary/token":
    '<html><h1>Token</h1><div data-registry-id="concept.token"></div></html>',
  "/docs/modules/grouped-query-attention": `<html>${buildGroupedQueryAttentionStubBody()}</html>`,
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

function createPhase1StubServer(
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

describe("PHASE_1_ROUTE_ASSERTIONS", () => {
  test("covers all Phase 1 manual-gate reader routes", () => {
    expect(PHASE_1_ROUTE_ASSERTIONS.map((route) => route.path)).toEqual([
      "/",
      "/search",
      "/docs/architecture",
      "/docs/glossary",
      "/tags",
      "/tags/attention",
      "/docs/glossary/token",
      "/docs/modules/grouped-query-attention",
    ]);
  });

  test("grouped-query-attention stub excludes forbidden placeholder markers", () => {
    const gqaHtml = PASSING_STUB_HTML["/docs/modules/grouped-query-attention"];
    expect(gqaHtml).toBeDefined();
    for (const forbidden of GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS) {
      expect(gqaHtml).not.toContain(forbidden);
    }
  });

  test("assertBody passes on expected markers and rejects placeholders", () => {
    for (const route of PHASE_1_ROUTE_ASSERTIONS) {
      const passingHtml = PASSING_STUB_HTML[route.path];
      expect(passingHtml).toBeDefined();
      if (!passingHtml) {
        throw new Error(`missing stub HTML for ${route.path}`);
      }
      expect(route.assertBody(passingHtml)).toBeNull();
    }

    const attentionRoute = PHASE_1_ROUTE_ASSERTIONS.find(
      (route) => route.path === "/tags/attention",
    );
    expect(attentionRoute?.assertBody("<html>lorem ipsum</html>")).toMatch(
      /lorem|missing/i,
    );
  });
});

describe("runPhase1RouteChecks", () => {
  test("returns no failures when stub server serves Phase 1 markers", async () => {
    const httpServer = createPhase1StubServer(PASSING_STUB_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1RouteChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
      });
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports route, status, and reason on non-200 responses", async () => {
    const httpServer = createPhase1StubServer(PASSING_STUB_HTML, {
      "/search": 500,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1RouteChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
        routes: PHASE_1_ROUTE_ASSERTIONS.filter(
          (route) => route.path === "/search",
        ),
      });

      const failure = failures[0];
      expect(failures).toEqual([
        {
          url: `http://127.0.0.1:${port}/search`,
          route: "/search",
          status: 500,
          reason: "expected HTTP 200",
        },
      ]);
      expect(failure).toBeDefined();
      if (!failure) {
        throw new Error("expected a route check failure");
      }
      expect(formatPhase1RouteCheckFailure(failure)).toBe(
        `http://127.0.0.1:${port}/search: HTTP 500 — expected HTTP 200`,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("stops at the first failing route", async () => {
    const httpServer = createPhase1StubServer({
      ...PASSING_STUB_HTML,
      "/": "<html>wrong title</html>",
      "/search": "<html>also wrong</html>",
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1RouteChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
      });
      expect(failures).toHaveLength(1);
      expect(failures[0]?.route).toBe("/");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports missing content markers with route and HTTP 200 status", async () => {
    const httpServer = createPhase1StubServer({
      ...PASSING_STUB_HTML,
      "/": "<html>wrong title</html>",
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1RouteChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
        routes: PHASE_1_ROUTE_ASSERTIONS.filter((route) => route.path === "/"),
      });

      expect(failures).toHaveLength(1);
      expect(failures[0]?.route).toBe("/");
      expect(failures[0]?.status).toBe(200);
      expect(failures[0]?.reason).toContain("Model Atlas");
      expect(failures[0]?.url).toBe(`http://127.0.0.1:${port}/`);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertPhase1Routes", () => {
  test("prints the first failing URL and marker to stderr before exit", async () => {
    const httpServer = createPhase1StubServer({
      ...PASSING_STUB_HTML,
      "/docs/architecture": "<html>missing markers</html>",
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
        assertPhase1Routes(baseUrl, {
          timeoutMs: 2_000,
          routes: PHASE_1_ROUTE_ASSERTIONS.filter(
            (route) =>
              route.path === "/" ||
              route.path === "/search" ||
              route.path === "/docs/architecture",
          ),
        }),
      ).rejects.toThrow("Phase 1 route verification failed");

      expect(stderrLines.join("\n")).toContain(`${baseUrl}/docs/architecture`);
      expect(stderrLines.join("\n")).toContain("Architecture");
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
