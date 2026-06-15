import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertBuiltAppRouteHtml,
  normalizeBuiltAppHtmlInternalPaths,
} from "@/lib/build/built-app-html-test-utils";
import { verifyPhase1ExportRouteFromFile } from "@/lib/build/verify-phase-1-export-routes";
import {
  PHASE_1_ATTENTION_TAG_SLUG,
  PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL,
} from "@/lib/content/phase-1-published-resources";
import {
  formatPhase1RouteCheckFailure,
  PHASE_1_ROUTE_ASSERTIONS,
  runPhase1RouteChecks,
} from "@/lib/verify/phase-1-route-checks";

const ATTENTION_TAG_ROUTE = "/tags/attention";
const GQA_HREF = `href="${PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL}"`;
const SEARCH_TAG_HREF = `href="/search?tag=${PHASE_1_ATTENTION_TAG_SLUG}"`;

/** Attention tag landing HTML that satisfies every marker except grouped-query-attention. */
const ATTENTION_TAG_HTML_WITHOUT_GQA = `<html>
  <h1>Attention</h1>
  <a href="/docs/glossary/token">Token</a>
  <a ${SEARCH_TAG_HREF}>Search attention</a>
</html>`;

/** Minimal passing attention tag landing HTML for shared assertion checks. */
const ATTENTION_TAG_HTML_WITH_GQA = `<html>
  <h1>Attention</h1>
  <a ${GQA_HREF}>Grouped-Query Attention</a>
  <a href="/docs/glossary/token">Token</a>
  <a ${SEARCH_TAG_HREF}>Search attention</a>
</html>`;

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

function createAttentionTagStubServer(
  html: string,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    if (path === ATTENTION_TAG_ROUTE) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<html>not found</html>");
  });
}

describe("Phase 1 attention tag discovery regression", () => {
  test("runPhase1RouteChecks fails when /tags/attention returns HTTP 200 without grouped-query-attention", async () => {
    const httpServer = createAttentionTagStubServer(
      ATTENTION_TAG_HTML_WITHOUT_GQA,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1RouteChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
        routes: PHASE_1_ROUTE_ASSERTIONS.filter(
          (route) => route.path === ATTENTION_TAG_ROUTE,
        ),
      });

      expect(failures).toHaveLength(1);
      const failure = failures[0];
      expect(failure).toBeDefined();
      if (!failure) {
        throw new Error("expected a route check failure");
      }
      expect(failure.route).toBe(ATTENTION_TAG_ROUTE);
      expect(failure.status).toBe(200);
      expect(failure.reason).toContain(GQA_HREF);
      expect(formatPhase1RouteCheckFailure(failure)).toContain(GQA_HREF);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("assertBuiltAppRouteHtml reports the same grouped-query-attention gap for built-app HTML", () => {
    const builtAppReason = assertBuiltAppRouteHtml(
      ATTENTION_TAG_ROUTE,
      normalizeBuiltAppHtmlInternalPaths(ATTENTION_TAG_HTML_WITHOUT_GQA),
    );
    const attentionAssertion = PHASE_1_ROUTE_ASSERTIONS.find(
      (route) => route.path === ATTENTION_TAG_ROUTE,
    );

    expect(attentionAssertion).toBeDefined();
    expect(builtAppReason).toContain(GQA_HREF);
    expect(builtAppReason).toBe(
      attentionAssertion?.assertBody(ATTENTION_TAG_HTML_WITHOUT_GQA) ?? null,
    );
  });

  test("built-app and verifier paths share the canonical grouped-query-attention href contract", () => {
    const attentionAssertion = PHASE_1_ROUTE_ASSERTIONS.find(
      (route) => route.path === ATTENTION_TAG_ROUTE,
    );
    expect(attentionAssertion).toBeDefined();

    const passingReason = attentionAssertion?.assertBody(
      ATTENTION_TAG_HTML_WITH_GQA,
    );
    const builtAppPassingReason = assertBuiltAppRouteHtml(
      ATTENTION_TAG_ROUTE,
      ATTENTION_TAG_HTML_WITH_GQA,
    );

    expect(passingReason).toBeNull();
    expect(builtAppPassingReason).toBeNull();
    expect(ATTENTION_TAG_HTML_WITH_GQA).toContain(GQA_HREF);
    expect(PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL).toBe(
      "/docs/modules/grouped-query-attention",
    );
  });

  test("verifyPhase1ExportRouteFromFile fails when exported /tags/attention omits grouped-query-attention", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-attention-tag-regression-"));
    mkdirSync(join(dir, "out", "tags"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "tags", "attention.html"),
      ATTENTION_TAG_HTML_WITHOUT_GQA,
    );

    try {
      const result = verifyPhase1ExportRouteFromFile(ATTENTION_TAG_ROUTE, {
        cwd: dir,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.route).toBe(ATTENTION_TAG_ROUTE);
        expect(result.reason).toContain(GQA_HREF);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
