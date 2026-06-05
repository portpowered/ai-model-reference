import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { pickListenPort } from "./http-harness";
import {
  type RouteFamilyHttpConvergenceRoute,
  runRouteFamilyHttpConvergenceChecks,
} from "./route-family-http-convergence-runner";

const PASS_HTML = "<html>ok</html>";
const FAIL_ASSERTION_REASON = "missing expected marker";

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

function createStubServer(options: {
  htmlByPath?: Record<string, string>;
  statusByPath?: Record<string, number>;
  onRequest?: (path: string) => void;
}): ReturnType<typeof createHttpServer> {
  const { htmlByPath = {}, statusByPath = {}, onRequest } = options;
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    onRequest?.(path);
    const status = statusByPath[path] ?? 200;
    const body = htmlByPath[path] ?? PASS_HTML;
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

const FIRST_ROUTE: RouteFamilyHttpConvergenceRoute = {
  path: "/first",
  label: "/first",
  assertBody: (html) =>
    html.includes("first-ok") ? null : FAIL_ASSERTION_REASON,
};

const TWO_ROUTE_TABLE: readonly RouteFamilyHttpConvergenceRoute[] = [
  FIRST_ROUTE,
  {
    path: "/second",
    label: "/second",
    assertBody: (html) =>
      html.includes("second-ok") ? null : "second route should not run",
  },
];

describe("runRouteFamilyHttpConvergenceChecks", () => {
  test("returns no failures when every route is HTTP 200 and assertions pass", async () => {
    const httpServer = createStubServer({
      htmlByPath: {
        "/first": "<html>first-ok</html>",
        "/second": "<html>second-ok</html>",
      },
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runRouteFamilyHttpConvergenceChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000, routes: TWO_ROUTE_TABLE },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns one non-200 failure and does not fetch later routes", async () => {
    const requestedPaths: string[] = [];
    const httpServer = createStubServer({
      statusByPath: { "/first": 404 },
      htmlByPath: {
        "/first": PASS_HTML,
        "/second": "<html>second-ok</html>",
      },
      onRequest: (path) => requestedPaths.push(path),
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runRouteFamilyHttpConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
        routes: TWO_ROUTE_TABLE,
      });

      expect(failures).toEqual([
        {
          url: `${baseUrl}/first`,
          route: "/first",
          status: 404,
          reason: "expected HTTP 200",
        },
      ]);
      expect(requestedPaths).toEqual(["/first"]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns one assertion failure and does not fetch later routes", async () => {
    const requestedPaths: string[] = [];
    const httpServer = createStubServer({
      htmlByPath: {
        "/first": "<html>wrong</html>",
        "/second": "<html>second-ok</html>",
      },
      onRequest: (path) => requestedPaths.push(path),
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runRouteFamilyHttpConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
        routes: TWO_ROUTE_TABLE,
      });

      expect(failures).toEqual([
        {
          url: `${baseUrl}/first`,
          route: "/first",
          status: 200,
          reason: FAIL_ASSERTION_REASON,
        },
      ]);
      expect(requestedPaths).toEqual(["/first"]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns one timeout failure with formatted reason", async () => {
    const httpServer = createHttpServer(() => {
      // Never respond — client should hit the hard deadline.
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;
    const timeoutMs = 200;

    try {
      const failures = await runRouteFamilyHttpConvergenceChecks(baseUrl, {
        timeoutMs,
        routes: [FIRST_ROUTE],
      });

      expect(failures).toEqual([
        {
          url: `${baseUrl}/first`,
          route: "/first",
          status: null,
          reason: `request timed out after ${timeoutMs}ms`,
        },
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns one network failure with the error message as reason", async () => {
    const port = await pickListenPort();
    const baseUrl = `http://127.0.0.1:${port}`;

    const failures = await runRouteFamilyHttpConvergenceChecks(baseUrl, {
      timeoutMs: 500,
      routes: [FIRST_ROUTE],
    });

    expect(failures).toHaveLength(1);
    const failure = failures[0];
    expect(failure?.url).toBe(`${baseUrl}/first`);
    expect(failure?.route).toBe("/first");
    expect(failure?.status).toBeNull();
    expect(failure?.reason.length).toBeGreaterThan(0);
  });

  test("strips trailing slashes from the base URL before building request URLs", async () => {
    const httpServer = createStubServer({
      htmlByPath: { "/only": "<html>only-ok</html>" },
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runRouteFamilyHttpConvergenceChecks(
        `${baseUrl}/`,
        {
          timeoutMs: 2_000,
          routes: [
            {
              path: "/only",
              label: "/only",
              assertBody: (html) => (html.includes("only-ok") ? null : "fail"),
            },
          ],
        },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
