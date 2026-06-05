import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { READER_ROUTE_CONTENT_CONVERGENCE_REASONS } from "./reader-route-content-convergence";
import {
  assertReaderRouteContentConvergenceRoutes,
  formatReaderRouteContentConvergenceCheckFailure,
  READER_ROUTE_CONTENT_CONVERGENCE_ROUTES,
  runReaderRouteContentConvergenceChecks,
} from "./reader-route-content-convergence-http";

const PASSING_STUB_HTML: Record<string, string> = {
  "/": "<html><title>Model Atlas</title><h1>Model Atlas</h1></html>",
  "/search": "<html><h1>Search</h1><p>Search Model Atlas</p></html>",
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

function createReaderRouteStubServer(
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

describe("READER_ROUTE_CONTENT_CONVERGENCE_ROUTES", () => {
  test("covers Phase 1 home and search manual-gate routes", () => {
    expect(
      READER_ROUTE_CONTENT_CONVERGENCE_ROUTES.map((route) => route.path),
    ).toEqual(["/", "/search"]);
  });
});

describe("runReaderRouteContentConvergenceChecks", () => {
  test("returns no failures when stub server serves reader route markers", async () => {
    const httpServer = createReaderRouteStubServer(PASSING_STUB_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runReaderRouteContentConvergenceChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports missing home markers with request URL and stable reason", async () => {
    const httpServer = createReaderRouteStubServer({
      ...PASSING_STUB_HTML,
      "/": "<html><h1>Wrong title</h1></html>",
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runReaderRouteContentConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
      });

      const failure = failures[0];
      expect(failures).toEqual([
        {
          url: `${baseUrl}/`,
          route: "/",
          status: 200,
          reason: READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingModelAtlas,
        },
      ]);
      expect(failure).toBeDefined();
      if (!failure) {
        throw new Error("expected a reader route content convergence failure");
      }
      expect(formatReaderRouteContentConvergenceCheckFailure(failure)).toBe(
        `${baseUrl}/: HTTP 200 — ${READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingModelAtlas}`,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("stops at the first failing route", async () => {
    const httpServer = createReaderRouteStubServer({
      "/": "<html><h1>Wrong title</h1></html>",
      "/search": "<html><h1>Also wrong</h1></html>",
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runReaderRouteContentConvergenceChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toHaveLength(1);
      expect(failures[0]?.route).toBe("/");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertReaderRouteContentConvergenceRoutes", () => {
  test("prints the failing URL and reader route reason to stderr before exit", async () => {
    const httpServer = createReaderRouteStubServer({
      ...PASSING_STUB_HTML,
      "/search": "<html><h1>Find</h1></html>",
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
        assertReaderRouteContentConvergenceRoutes(baseUrl, {
          timeoutMs: 2_000,
        }),
      ).rejects.toThrow(
        "Phase 1 reader route content convergence verification failed",
      );

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/search`);
      expect(stderr).toContain(
        READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingSearchTitle,
      );
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
