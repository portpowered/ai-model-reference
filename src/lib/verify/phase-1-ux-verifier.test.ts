import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { join } from "node:path";
import { assertBatch008CustomerAskReportAllPass } from "./batch-008-customer-ask-check-inventory";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import { buildPhase1AndCustomerAskPassingStubHtml } from "./customer-ask-convergence-stub-fixtures";
import { DOCS_SHELL_CONVERGENCE_REASONS } from "./docs-shell-convergence";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "./home-search-entry-convergence";
import { pickListenPort } from "./http-harness";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { PHASE_1_UX_PASSING_STUB_HTML } from "./phase-1-ux-stub-fixtures";
import {
  PHASE_1_UX_SUCCESS_MESSAGE,
  runPhase1UxVerification,
} from "./phase-1-ux-verifier";
import {
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  defaultSpawnProductionServer,
  hasNextProductionBuild,
  killManagedChild,
  waitForServerReady,
} from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");
const VERIFY_SCRIPT_E2E_TIMEOUT_MS = DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 90_000;

const GQA_HIT = { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL };
const OTHER_HIT = { url: "/docs/glossary/token" };

const DEFAULT_CONVERGENCE_OPTIONS = {
  docsShellOptions: { timeoutMs: 2_000 },
  homeSearchEntryOptions: { timeoutMs: 2_000 },
  readerConvergenceOptions: {
    readerRouteOptions: { timeoutMs: 2_000 },
    tagsNavigationOptions: { timeoutMs: 2_000 },
  },
} as const;

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

function createPhase1UxStubServer(
  htmlByPath: Record<string, string> = PHASE_1_UX_PASSING_STUB_HTML,
): ReturnType<typeof createHttpServer> {
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

    const body = htmlByPath[path] ?? "<html>not found</html>";
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
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: { timeoutMs: 2_000 },
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: { runQueryCheck: async () => null },
          searchShortcutOptions: { runShortcutCheck: async () => null },
        }),
      ).resolves.toBeUndefined();
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails on docs shell convergence before route and search checks", async () => {
    const httpServer = createPhase1UxStubServer({
      ...PHASE_1_UX_PASSING_STUB_HTML,
      "/docs/architecture": `<html><header><nav aria-label="Primary">Model Atlas</nav></header><article>split shell</article></html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: { timeoutMs: 2_000 },
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: { runQueryCheck: async () => null },
          searchShortcutOptions: { runShortcutCheck: async () => null },
        }),
      ).rejects.toThrow("Phase 1 docs shell convergence verification failed");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails on redundant home search before route and search checks", async () => {
    const preRepairHome = PHASE_1_UX_PASSING_STUB_HTML["/"]?.replace(
      "<article>",
      `<article><section id="search"><h2>${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2><input data-search="" /></section>`,
    );
    if (!preRepairHome) {
      throw new Error("expected home fixture");
    }

    const httpServer = createPhase1UxStubServer({
      ...PHASE_1_UX_PASSING_STUB_HTML,
      "/": preRepairHome,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: { timeoutMs: 2_000 },
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: { runQueryCheck: async () => null },
          searchShortcutOptions: { runShortcutCheck: async () => null },
        }),
      ).rejects.toThrow(
        "Phase 1 home search entry convergence verification failed",
      );
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
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
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
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: { runQueryCheck: async () => null },
          searchShortcutOptions: { runShortcutCheck: async () => null },
        }),
      ).rejects.toThrow("Phase 1 route verification failed");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails on header search dialog check after routes, API, and /search pass", async () => {
    const httpServer = createPhase1UxStubServer();
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: { timeoutMs: 2_000 },
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: {
            runQueryCheck: async (_baseUrl, query) =>
              `forced header dialog failure for ${query}`,
          },
          searchShortcutOptions: { runShortcutCheck: async () => null },
        }),
      ).rejects.toThrow("Phase 1 header search dialog verification failed");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails on /search page check after routes and API search pass", async () => {
    const httpServer = createPhase1UxStubServer();
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: { timeoutMs: 2_000 },
          searchPageOptions: {
            runQueryCheck: async (_baseUrl, query) =>
              `forced /search failure for ${query}`,
          },
          searchDialogOptions: { runQueryCheck: async () => null },
          searchShortcutOptions: { runShortcutCheck: async () => null },
        }),
      ).rejects.toThrow("Phase 1 /search page verification failed");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails on keyboard shortcut check after routes, API, /search, and dialog pass", async () => {
    const httpServer = createPhase1UxStubServer();
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        runPhase1UxVerification(`http://127.0.0.1:${port}`, {
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
          routeOptions: { timeoutMs: 2_000 },
          searchOptions: { timeoutMs: 2_000 },
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: { runQueryCheck: async () => null },
          searchShortcutOptions: {
            runShortcutCheck: async (_baseUrl, shortcut) =>
              `forced shortcut failure for ${shortcut.label}`,
          },
        }),
      ).rejects.toThrow("Phase 1 search keyboard shortcut verification failed");
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
          convergenceOptions: DEFAULT_CONVERGENCE_OPTIONS,
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
          searchPageOptions: { runQueryCheck: async () => null },
          searchDialogOptions: { runQueryCheck: async () => null },
          searchShortcutOptions: { runShortcutCheck: async () => null },
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
  const mergedEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete mergedEnv[key];
    } else {
      mergedEnv[key] = value;
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      "bun",
      [join(process.cwd(), "scripts/verify-phase-1-route-search-ux.ts")],
      {
        env: mergedEnv,
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
    const httpServer = createPhase1UxStubServer(
      buildPhase1AndCustomerAskPassingStubHtml(),
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const result = await runVerifyScriptWithEnv({
        VERIFY_BASE_URL: `http://127.0.0.1:${port}`,
        VERIFY_SEARCH_PAGE_STUB: "pass",
        VERIFY_SEARCH_DIALOG_STUB: "pass",
        VERIFY_SEARCH_SHORTCUT_STUB: "pass",
      });

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER);
      assertBatch008CustomerAskReportAllPass(result.output);
      expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("exits 1 with docs shell convergence failure on split-shell stub", async () => {
    const httpServer = createPhase1UxStubServer({
      ...PHASE_1_UX_PASSING_STUB_HTML,
      "/docs/architecture": `<html><header><nav aria-label="Primary">Model Atlas</nav></header><article>split shell</article></html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const result = await runVerifyScriptWithEnv({
        VERIFY_BASE_URL: `http://127.0.0.1:${port}`,
        VERIFY_SEARCH_PAGE_STUB: "pass",
        VERIFY_SEARCH_DIALOG_STUB: "pass",
        VERIFY_SEARCH_SHORTCUT_STUB: "pass",
      });

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("/docs/architecture");
      expect(result.output).toContain(
        DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("verify-phase-1-route-search-ux script integration", () => {
  test(
    "exits 0 with default spawn when production build exists",
    async () => {
      if (!hasNextProductionBuild(repoRoot)) {
        return;
      }

      const result = await runVerifyScriptWithEnv({
        VERIFY_BASE_URL: undefined,
      });

      expect(result.exitCode).toBe(0);
      assertBatch008CustomerAskReportAllPass(result.output);
      expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);
    },
    VERIFY_SCRIPT_E2E_TIMEOUT_MS,
  );

  test(
    "exits 0 with VERIFY_BASE_URL against manually started production server",
    async () => {
      if (!hasNextProductionBuild(repoRoot)) {
        return;
      }

      const port = await pickListenPort();
      const child = defaultSpawnProductionServer(port, repoRoot);

      try {
        await waitForServerReady(`http://127.0.0.1:${port}`, {
          timeoutMs: DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
        });

        const result = await runVerifyScriptWithEnv({
          VERIFY_BASE_URL: `http://127.0.0.1:${port}`,
        });

        expect(result.exitCode).toBe(0);
        assertBatch008CustomerAskReportAllPass(result.output);
        expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);
      } finally {
        await killManagedChild(child);
      }
    },
    VERIFY_SCRIPT_E2E_TIMEOUT_MS,
  );
});
