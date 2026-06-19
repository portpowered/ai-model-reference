import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { CANONICAL_GITHUB_PAGES_BASE_PATH } from "./phase-1-github-pages-deploy-workflow";
import {
  assertJapaneseAttentionRouteChecks,
  formatJapaneseAttentionRouteCheckFailure,
  JAPANESE_ATTENTION_ROUTE_ASSERTIONS,
  runJapaneseAttentionRouteChecks,
} from "./phase-4-japanese-attention-route-checks";

const PASSING_STUB_HTML: Record<string, string> = {
  "/ja/tags/attention": `<html>
    <h1>Attention</h1>
    <p>このタグを検索</p>
    <a href="/ja/search?tag=attention">search</a>
    <a href="/ja/docs/modules/attention">attention</a>
    <a href="/ja/docs/glossary/token">token</a>
    <a href="/ja/docs/modules/multi-head-attention">mha</a>
    <a href="/ja/docs/modules/multi-query-attention">mqa</a>
    <a href="/ja/docs/modules/linear-attention">linear</a>
    <a href="/ja/docs/modules/sliding-window-attention">window</a>
  </html>`,
  "/ja/search": `<html>
    <h1>検索</h1>
    <p>正規の検索エントリ URL: /search。</p>
    <p>/search?tag=attention</p>
    <output data-testid="search-page-idle"></output>
  </html>`,
  "/ja/docs/modules/multi-head-attention": `<html>
    <h1>マルチヘッド attention</h1>
    <div data-registry-id="module.multi-head-attention"></div>
    <a href="/ja/tags/attention">attention tag</a>
    <a href="/ja/docs/modules/attention">attention</a>
    <a href="/ja/docs/modules/multi-query-attention">mqa</a>
  </html>`,
  "/ja/docs/modules/multi-query-attention": `<html>
    <h1>マルチクエリ attention</h1>
    <div data-registry-id="module.multi-query-attention"></div>
    <a href="/ja/tags/attention">attention tag</a>
    <a href="/ja/docs/modules/grouped-query-attention">gqa</a>
    <a href="/ja/docs/modules/multi-head-attention">mha</a>
    <a href="/docs/glossary/kv-cache">kv cache</a>
  </html>`,
  "/ja/docs/modules/linear-attention": `<html>
    <h1>線形 attention</h1>
    <div data-registry-id="module.linear-attention"></div>
    <a href="/ja/tags/attention">attention tag</a>
    <a href="/ja/docs/modules/multi-head-attention">mha</a>
    <a href="/ja/docs/modules/multi-query-attention">mqa</a>
    <div data-graph-id="graph.linear-attention-linear-comparison"></div>
  </html>`,
  "/ja/docs/modules/sliding-window-attention": `<html>
    <h1>スライディングウィンドウ attention</h1>
    <div data-registry-id="module.sliding-window-attention"></div>
    <a href="/ja/tags/attention">attention tag</a>
    <a href="/ja/docs/modules/multi-head-attention">mha</a>
    <a href="/ja/docs/modules/multi-query-attention">mqa</a>
    <div data-graph-id="graph.sliding-window-attention-time-window-pattern"></div>
  </html>`,
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

function createJapaneseAttentionStubServer(
  htmlByPath: Record<string, string>,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    const status = 200;
    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

describe("JAPANESE_ATTENTION_ROUTE_ASSERTIONS", () => {
  test("covers the localized discovery and module proof routes", () => {
    expect(
      JAPANESE_ATTENTION_ROUTE_ASSERTIONS.map((route) => route.path),
    ).toEqual([
      "/ja/tags/attention",
      "/ja/search?tag=attention",
      "/ja/docs/modules/multi-head-attention",
      "/ja/docs/modules/multi-query-attention",
      "/ja/docs/modules/linear-attention",
      "/ja/docs/modules/sliding-window-attention",
    ]);
  });
});

describe("runJapaneseAttentionRouteChecks", () => {
  test("returns no failures when stub server serves the shipped Japanese proof markers", async () => {
    const httpServer = createJapaneseAttentionStubServer(PASSING_STUB_HTML);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runJapaneseAttentionRouteChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("accepts GitHub Pages base-path-prefixed localized links", async () => {
    const basePath = `/${CANONICAL_GITHUB_PAGES_BASE_PATH}`;
    const prefixedHtmlByPath = Object.fromEntries(
      Object.entries(PASSING_STUB_HTML).map(([path, html]) => [
        path,
        html.replaceAll('href="/', `href="${basePath}/`),
      ]),
    );
    const httpServer = createJapaneseAttentionStubServer(prefixedHtmlByPath);
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runJapaneseAttentionRouteChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports the first missing shipped localized marker", async () => {
    const httpServer = createJapaneseAttentionStubServer({
      ...PASSING_STUB_HTML,
      "/ja/tags/attention": `<html>
        <h1>Attention</h1>
        <p>このタグを検索</p>
        <a href="/ja/search?tag=attention">search</a>
      </html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const failures = await runJapaneseAttentionRouteChecks(baseUrl, {
        timeoutMs: 2_000,
      });

      expect(failures).toHaveLength(1);
      const failure = failures[0];
      expect(failure).toEqual({
        url: `${baseUrl}/ja/tags/attention`,
        route: "/ja/tags/attention",
        status: 200,
        reason: 'missing expected content: href="/ja/docs/modules/attention"',
      });
      if (!failure) {
        throw new Error("expected a localized route verification failure");
      }
      expect(formatJapaneseAttentionRouteCheckFailure(failure)).toBe(
        `${baseUrl}/ja/tags/attention: HTTP 200 — missing expected content: href="/ja/docs/modules/attention"`,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("assertJapaneseAttentionRouteChecks", () => {
  test("prints the failing localized route and reason before exit", async () => {
    const httpServer = createJapaneseAttentionStubServer({
      ...PASSING_STUB_HTML,
      "/ja/docs/modules/linear-attention":
        "<html><h1>Linear Attention</h1></html>",
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
        assertJapaneseAttentionRouteChecks(baseUrl, {
          timeoutMs: 2_000,
        }),
      ).rejects.toThrow("Phase 4 Japanese attention route verification failed");

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/ja/docs/modules/linear-attention`);
      expect(stderr).toContain("missing expected content: 線形 attention");
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
