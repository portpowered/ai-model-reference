import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  formatPhase1RouteCheckFailure,
  PHASE_1_ROUTE_ASSERTIONS,
  runPhase1RouteChecks,
} from "./phase-1-route-checks";

const PASSING_STUB_HTML: Record<string, string> = {
  "/": "<html><title>Model Atlas</title></html>",
  "/search": "<html><h1>Search</h1></html>",
  "/docs/glossary": "<html><h1>Glossary</h1><p>Token</p></html>",
  "/tags": '<html><h1>Tags</h1><a href="/tags/attention">Attention</a></html>',
  "/tags/attention":
    '<html><h1>Attention</h1><a href="/docs/modules/grouped-query-attention">GQA</a><a href="/docs/glossary/token">Token</a></html>',
  "/docs/glossary/token":
    '<html><h1>Token</h1><div data-registry-id="concept.token"></div></html>',
  "/docs/modules/grouped-query-attention":
    '<html><h1>Grouped-Query Attention</h1><div data-registry-id="module.grouped-query-attention"></div></html>',
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
      "/docs/glossary",
      "/tags",
      "/tags/attention",
      "/docs/glossary/token",
      "/docs/modules/grouped-query-attention",
    ]);
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
        "/search: HTTP 500 — expected HTTP 200",
      );
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
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
