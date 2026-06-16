import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  GROUPED_QUERY_ATTENTION_URL,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { assertPhase1ReaderConvergenceRoutes } from "./phase-1-reader-convergence-http";
import { READER_ROUTE_CONTENT_CONVERGENCE_REASONS } from "./reader-route-content-convergence";
import {
  ATTENTION_TAG_LANDING_PATH,
  ATTENTION_TAG_SCOPED_SEARCH_URL,
  TAGS_NAVIGATION_CONVERGENCE_REASONS,
} from "./tags-navigation-convergence";

const PRIMARY_NAV = '<nav aria-label="Primary">Model Atlas</nav>';

const PASSING_STUB_HTML: Record<string, string> = {
  "/": "<html><title>Model Atlas</title><h1>Model Atlas</h1></html>",
  "/search": "<html><h1>Search</h1><p>Search Model Atlas</p></html>",
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

function createReaderConvergenceStubServer(
  htmlByPath: Record<string, string>,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

describe("assertPhase1ReaderConvergenceRoutes", () => {
  test("passes reader route content before tags navigation on stub server", async () => {
    const httpServer = createReaderConvergenceStubServer(PASSING_STUB_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        assertPhase1ReaderConvergenceRoutes(`http://127.0.0.1:${port}`, {
          readerRouteOptions: { timeoutMs: 2_000 },
          tagsNavigationOptions: { timeoutMs: 2_000 },
        }),
      ).resolves.toBeUndefined();
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails reader route content before reaching tags navigation checks", async () => {
    const httpServer = createReaderConvergenceStubServer({
      ...PASSING_STUB_HTML,
      "/": "<html><h1>Wrong title</h1></html>",
      "/tags": "<html><h1>Tags without nav</h1></html>",
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
        assertPhase1ReaderConvergenceRoutes(baseUrl, {
          readerRouteOptions: { timeoutMs: 2_000 },
          tagsNavigationOptions: { timeoutMs: 2_000 },
        }),
      ).rejects.toThrow(
        "Phase 1 reader route content convergence verification failed",
      );

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/`);
      expect(stderr).toContain(
        READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingModelAtlas,
      );
      expect(stderr).not.toContain(`${baseUrl}/tags`);
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails tags navigation after reader route content passes", async () => {
    const httpServer = createReaderConvergenceStubServer({
      ...PASSING_STUB_HTML,
      "/tags": "<html><h1>Tags without nav</h1></html>",
      [ATTENTION_TAG_LANDING_PATH]:
        "<html><h1>Attention without nav</h1></html>",
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
        assertPhase1ReaderConvergenceRoutes(baseUrl, {
          readerRouteOptions: { timeoutMs: 2_000 },
          tagsNavigationOptions: { timeoutMs: 2_000 },
        }),
      ).rejects.toThrow(
        "Phase 1 tags navigation convergence verification failed",
      );

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/tags`);
      expect(stderr).toContain(
        TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav,
      );
      expect(stderr).not.toContain(`${baseUrl}${ATTENTION_TAG_LANDING_PATH}`);
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
