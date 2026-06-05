import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  GROUPED_QUERY_ATTENTION_URL,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import {
  ATTENTION_TAG_LANDING_PATH,
  ATTENTION_TAG_SCOPED_SEARCH_URL,
  TAGS_NAVIGATION_CONVERGENCE_REASONS,
} from "./tags-navigation-convergence";
import {
  assertTagsNavigationConvergenceRoutes,
  formatTagsNavigationConvergenceCheckFailure,
  runTagsNavigationConvergenceChecks,
  TAGS_NAVIGATION_CONVERGENCE_ROUTES,
} from "./tags-navigation-convergence-http";

const PRIMARY_NAV = '<nav aria-label="Primary">Model Atlas</nav>';

const PASSING_STUB_HTML: Record<string, string> = {
  "/tags": `<html><header>${PRIMARY_NAV}</header><h1>Tags</h1><a href="/tags/attention">Attention</a></html>`,
  [ATTENTION_TAG_LANDING_PATH]: `<html><header>${PRIMARY_NAV}</header><h1>Attention</h1><a href="${GROUPED_QUERY_ATTENTION_URL}">GQA</a><a href="${TOKEN_GLOSSARY_URL}">Token</a><a href="${ATTENTION_TAG_SCOPED_SEARCH_URL}">Search</a></html>`,
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

function createTagsNavigationStubServer(
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

describe("TAGS_NAVIGATION_CONVERGENCE_ROUTES", () => {
  test("covers Phase 1 tags index and attention landing routes", () => {
    expect(
      TAGS_NAVIGATION_CONVERGENCE_ROUTES.map((route) => route.path),
    ).toEqual(["/tags", ATTENTION_TAG_LANDING_PATH]);
  });
});

describe("runTagsNavigationConvergenceChecks", () => {
  test("returns no failures when stub server serves tags navigation markers", async () => {
    const httpServer = createTagsNavigationStubServer(PASSING_STUB_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runTagsNavigationConvergenceChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports missing primary navigation with request URL and stable reason", async () => {
    const httpServer = createTagsNavigationStubServer({
      ...PASSING_STUB_HTML,
      "/tags":
        '<html><h1>Tags</h1><a href="/tags/attention">Attention</a></html>',
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runTagsNavigationConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
      });

      const failure = failures[0];
      expect(failures).toEqual([
        {
          url: `${baseUrl}/tags`,
          route: "/tags",
          status: 200,
          reason: TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav,
        },
      ]);
      expect(failure).toBeDefined();
      if (!failure) {
        throw new Error("expected a tags navigation convergence failure");
      }
      expect(formatTagsNavigationConvergenceCheckFailure(failure)).toBe(
        `${baseUrl}/tags: HTTP 200 — ${TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav}`,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports missing attention landing links before placeholder copy", async () => {
    const httpServer = createTagsNavigationStubServer({
      ...PASSING_STUB_HTML,
      [ATTENTION_TAG_LANDING_PATH]:
        '<html><header><nav aria-label="Primary">Model Atlas</nav></header><h1>Attention</h1></html>',
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runTagsNavigationConvergenceChecks(baseUrl, {
        timeoutMs: 2_000,
        routes: TAGS_NAVIGATION_CONVERGENCE_ROUTES.filter(
          (route) => route.path === ATTENTION_TAG_LANDING_PATH,
        ),
      });

      expect(failures[0]?.reason).toBe(
        TAGS_NAVIGATION_CONVERGENCE_REASONS.missingSampleModuleLink,
      );
      expect(failures[0]?.url).toBe(`${baseUrl}${ATTENTION_TAG_LANDING_PATH}`);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertTagsNavigationConvergenceRoutes", () => {
  test("prints the failing URL and tags navigation reason to stderr before exit", async () => {
    const httpServer = createTagsNavigationStubServer({
      ...PASSING_STUB_HTML,
      [ATTENTION_TAG_LANDING_PATH]: "<html>lorem ipsum</html>",
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
        assertTagsNavigationConvergenceRoutes(baseUrl, { timeoutMs: 2_000 }),
      ).rejects.toThrow(
        "Phase 1 tags navigation convergence verification failed",
      );

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/tags`);
      expect(stderr).toContain(
        TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav,
      );
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
