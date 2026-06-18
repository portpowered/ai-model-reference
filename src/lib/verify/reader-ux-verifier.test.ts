import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { VERIFY_CUSTOMER_ASK_BATCH_012_STUB_ENV } from "./batch-012-customer-ask-convergence-http-env";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import {
  buildPhase1AndCustomerAskPassingStubHtml,
  CUSTOMER_ASK_PASSING_API_RESULTS,
} from "./customer-ask-convergence-stub-fixtures";
import { DOCS_SHELL_CONVERGENCE_REASONS } from "./docs-shell-convergence";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "./home-search-entry-convergence";
import {
  httpGetStatus,
  isListenPortFree,
  pickListenPort,
} from "./http-harness";
import { assertPhase1CustomerAskReportAllPassOrUncertain } from "./phase-1-customer-ask-check-inventory";
import {
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_GROUPED_QUERY_ATTENTION_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "./phase-1-search-checks";
import { PHASE_1_UX_PASSING_STUB_HTML } from "./phase-1-ux-stub-fixtures";
import {
  PHASE_1_UX_SUCCESS_MESSAGE,
  runPhase1UxVerification,
} from "./phase-1-ux-verifier";
import {
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  defaultSpawnProductionServer,
  killManagedChild,
  NEXT_BUILD_REQUIRED_MESSAGE,
  shouldRunVerifyProductionIntegrationTests,
  VERIFY_SERVER_STARTUP_TIMEOUT_MS_ENV,
  waitForServerReady,
} from "./server-lifecycle";
import { removeVerifyListenPortLockForTests } from "./verify-listen-port-lock";

const repoRoot = join(import.meta.dir, "../../..");
const VERIFY_SCRIPT_E2E_TIMEOUT_MS = DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 90_000;

const GQA_HIT = { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL };
const ATTENTION_HIT = { url: PHASE_1_ATTENTION_MODULE_URL };
const VECTOR_HIT = { url: PHASE_1_VECTOR_GLOSSARY_URL };
const HIDDEN_SIZE_HIT = { url: PHASE_1_HIDDEN_SIZE_GLOSSARY_URL };
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
        attention: [ATTENTION_HIT, OTHER_HIT, GQA_HIT],
        vector: [VECTOR_HIT, OTHER_HIT],
        "hidden size": [HIDDEN_SIZE_HIT, OTHER_HIT],
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

function buildFakeReadyNextBinBody(
  htmlByPath: Record<string, string>,
  apiResults: Record<string, Array<{ url: string }>>,
): string {
  const htmlJson = JSON.stringify(htmlByPath);
  const apiJson = JSON.stringify(apiResults);

  return `
const args = process.argv.slice(2);
const portFlagIndex = args.indexOf("-p");
const port = portFlagIndex >= 0 ? Number(args[portFlagIndex + 1]) : Number.NaN;
if (!Number.isFinite(port)) {
  console.error("fake next start: -p port required");
  process.exit(1);
}
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
const htmlByPath = ${htmlJson};
const apiResults = ${apiJson};
const server = createServer((req, res) => {
  const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
  const path = requestUrl.pathname;
  if (path === "/api/search") {
    const query = requestUrl.searchParams.get("query") ?? "";
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(apiResults[query] ?? []));
    return;
  }
  const body = htmlByPath[path] ?? "<html>not found</html>";
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
});
server.listen(port, "127.0.0.1", () => {
  writeFileSync(".verify-stub-port", String(port));
});
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
`;
}

const FAKE_NEVER_READY_NEXT_BIN_BODY = `
const args = process.argv.slice(2);
const portFlagIndex = args.indexOf("-p");
const port = portFlagIndex >= 0 ? Number(args[portFlagIndex + 1]) : Number.NaN;
if (!Number.isFinite(port)) {
  console.error("fake next start: -p port required");
  process.exit(1);
}
import { createServer } from "node:http";
createServer((_req, res) => {
  res.writeHead(503, { "Content-Type": "text/plain" });
  res.end("not ready");
}).listen(port, "127.0.0.1");
`;

function writeFakeNextBin(projectRoot: string, scriptBody: string): void {
  const nextBinPath = join(
    projectRoot,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  mkdirSync(dirname(nextBinPath), { recursive: true });
  writeFileSync(nextBinPath, `#!/usr/bin/env bun\n${scriptBody}`, {
    mode: 0o755,
  });
}

function createVerifyCliFixtureRoot(options: { nextBinBody: string }): string {
  const projectRoot = mkdtempSync(join(tmpdir(), "verify-cli-fixture-"));
  mkdirSync(join(projectRoot, ".next"));
  writeFakeNextBin(projectRoot, options.nextBinBody);
  return projectRoot;
}

function runVerifyScriptWithEnv(
  env: Record<string, string | undefined>,
  options: { cwd?: string } = {},
): Promise<{ exitCode: number; output: string }> {
  const mergedEnv = { ...process.env };
  for (const key of [
    "VERIFY_BASE_URL",
    "VERIFY_PRODUCTION_INTEGRATION_TESTS",
    "VERIFY_COVERAGE_SUBPROCESS",
    "CI",
    "GITHUB_ACTIONS",
  ] as const) {
    delete mergedEnv[key];
  }
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
      [join(repoRoot, "scripts/verify-phase-1-route-search-ux.ts")],
      {
        cwd: options.cwd ?? process.cwd(),
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
  afterEach(() => {
    removeVerifyListenPortLockForTests();
  });

  test.serial(
    "exits 1 with readiness failure when default spawn never becomes ready",
    async () => {
      const projectRoot = createVerifyCliFixtureRoot({
        nextBinBody: FAKE_NEVER_READY_NEXT_BIN_BODY,
      });
      const startupTimeoutMs = 200;

      try {
        const result = await runVerifyScriptWithEnv(
          {
            VERIFY_BASE_URL: undefined,
            [VERIFY_SERVER_STARTUP_TIMEOUT_MS_ENV]: String(startupTimeoutMs),
          },
          { cwd: projectRoot },
        );

        expect(result.exitCode).toBe(1);
        expect(result.output).toMatch(
          /did not become ready|exited before becoming ready/i,
        );
        expect(result.output).toContain("health URL http://127.0.0.1:");
        expect(result.output).toContain(`within ${startupTimeoutMs}ms`);
      } finally {
        rmSync(projectRoot, { recursive: true, force: true });
      }
    },
    DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 5_000,
  );

  test.serial(
    "exits 0 with success summary on default path when fake next serves passing stub",
    async () => {
      const projectRoot = createVerifyCliFixtureRoot({
        nextBinBody: buildFakeReadyNextBinBody(
          buildPhase1AndCustomerAskPassingStubHtml(),
          CUSTOMER_ASK_PASSING_API_RESULTS,
        ),
      });

      try {
        const result = await runVerifyScriptWithEnv(
          {
            VERIFY_BASE_URL: undefined,
            VERIFY_SEARCH_PAGE_STUB: "pass",
            VERIFY_SEARCH_DIALOG_STUB: "pass",
            VERIFY_SEARCH_SHORTCUT_STUB: "pass",
            VERIFY_DOCS_FOOTER_STUB: "pass",
            [VERIFY_CUSTOMER_ASK_BATCH_012_STUB_ENV]: "pass",
          },
          { cwd: projectRoot },
        );

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER);
        assertPhase1CustomerAskReportAllPassOrUncertain(result.output);
        expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);

        const stubPort = Number(
          readFileSync(join(projectRoot, ".verify-stub-port"), "utf8").trim(),
        );
        expect(Number.isFinite(stubPort)).toBe(true);
        expect(await isListenPortFree(stubPort)).toBe(true);
        await expect(
          httpGetStatus(`http://127.0.0.1:${stubPort}/`, 500),
        ).rejects.toBeDefined();
      } finally {
        rmSync(projectRoot, { recursive: true, force: true });
      }
    },
    DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 15_000,
  );

  test("exits 1 with NEXT_BUILD_REQUIRED_MESSAGE when .next is missing on default path", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-cli-no-next-"));

    try {
      const result = await runVerifyScriptWithEnv(
        { VERIFY_BASE_URL: undefined },
        { cwd: projectRoot },
      );

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain(NEXT_BUILD_REQUIRED_MESSAGE);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

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
        VERIFY_DOCS_FOOTER_STUB: "pass",
        [VERIFY_CUSTOMER_ASK_BATCH_012_STUB_ENV]: "pass",
      });

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER);
      assertPhase1CustomerAskReportAllPassOrUncertain(result.output);
      expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test(
    "exits 1 with docs shell convergence failure on split-shell stub",
    async () => {
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
          VERIFY_DOCS_FOOTER_STUB: "pass",
          [VERIFY_CUSTOMER_ASK_BATCH_012_STUB_ENV]: "pass",
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
    },
    { timeout: 60_000 },
  );
});

describe("verify-phase-1-route-search-ux script integration", () => {
  test(
    "exits 0 with default spawn when production build exists",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const result = await runVerifyScriptWithEnv({
        VERIFY_BASE_URL: undefined,
      });

      expect(result.exitCode).toBe(0);
      assertPhase1CustomerAskReportAllPassOrUncertain(result.output);
      expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);
    },
    VERIFY_SCRIPT_E2E_TIMEOUT_MS,
  );

  test(
    "exits 0 with VERIFY_BASE_URL against manually started production server",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
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
        assertPhase1CustomerAskReportAllPassOrUncertain(result.output);
        expect(result.output).toContain(PHASE_1_UX_SUCCESS_MESSAGE);
      } finally {
        await killManagedChild(child);
      }
    },
    VERIFY_SCRIPT_E2E_TIMEOUT_MS,
  );
});
