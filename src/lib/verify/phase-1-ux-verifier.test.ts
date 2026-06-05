import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { join } from "node:path";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import {
  PHASE_1_UX_SUCCESS_MESSAGE,
  runPhase1UxVerification,
} from "./phase-1-ux-verifier";

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
  "/docs/modules/grouped-query-attention":
    '<html><h1>Grouped-Query Attention</h1><div data-registry-id="module.grouped-query-attention"></div></html>',
};

const GQA_HIT = { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL };
const OTHER_HIT = { url: "/docs/glossary/token" };

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

function createPhase1UxStubServer(): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = requestUrl.pathname;

    if (path === "/api/search") {
      const query = requestUrl.searchParams.get("query") ?? "";
      const hitsByQuery: Record<string, (typeof GQA_HIT)[]> = {
        GQA: [GQA_HIT, OTHER_HIT],
        attention: [OTHER_HIT, GQA_HIT],
        "KV cache": [OTHER_HIT, GQA_HIT],
      };
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(hitsByQuery[query] ?? []));
      return;
    }

    const body = PASSING_STUB_HTML[path] ?? "<html>not found</html>";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

describe("runPhase1UxVerification", () => {
  test("passes when route and search checks succeed", async () => {
    const httpServer = createPhase1UxStubServer();
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: { timeoutMs: 2_000 },
        }),
      ).resolves.toBeUndefined();
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails on route check before search when a reader route is wrong", async () => {
    const httpServer = createPhase1UxStubServer();
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          routeOptions: {
            timeoutMs: 2_000,
            routes: [
              {
                path: "/",
                label: "/",
                assertBody: () => "forced route failure",
              },
            ],
          },
          searchOptions: { timeoutMs: 2_000 },
        }),
      ).rejects.toThrow("Phase 1 route verification failed");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails on search check after routes pass", async () => {
    const httpServer = createPhase1UxStubServer();
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: {
            timeoutMs: 2_000,
            searches: [
              {
                query: "GQA",
                label: "/api/search?query=GQA",
                assertResults: () => "forced search failure",
              },
            ],
          },
        }),
      ).rejects.toThrow("Phase 1 search verification failed");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

function runVerifyScriptWithEnv(
  env: Record<string, string | undefined>,
): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "bun",
      [join(process.cwd(), "scripts/verify-phase-1-route-search-ux.ts")],
      {
        env: {
          ...process.env,
          ...env,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let output = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ exitCode: code ?? 1, output });
    });
  });
}

describe("verify-phase-1-route-search-ux script", () => {
  test("exits 0 with success summary when VERIFY_BASE_URL points at a passing stub", async () => {
    const httpServer = createPhase1UxStubServer();
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const result = await runVerifyScriptWithEnv({
        VERIFY_BASE_URL: `http://127.0.0.1:${port}`,
      });

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
