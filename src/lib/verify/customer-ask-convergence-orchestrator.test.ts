import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
  getCustomerAskConvergenceExitCode,
  runCustomerAskConvergenceChecks,
  runPhase1CustomerAskConvergenceVerification,
} from "./customer-ask-convergence-orchestrator";
import {
  buildPhase1AndCustomerAskPassingStubHtml,
  CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
  CUSTOMER_ASK_PASSING_API_RESULTS,
  CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS,
  CUSTOMER_ASK_PRE_REPAIR_GLOSSARY_HTML,
  CUSTOMER_ASK_PRE_REPAIR_GQA_MODULE_HTML,
  CUSTOMER_ASK_PRE_REPAIR_HOME_HTML,
  CUSTOMER_ASK_PRE_REPAIR_TAGS_INDEX_HTML,
} from "./customer-ask-convergence-stub-fixtures";
import { GLOSSARY_CUSTOMER_ASK_CHECKS } from "./customer-ask-glossary-convergence";
import { GQA_MODULE_CUSTOMER_ASK_CHECKS } from "./customer-ask-gqa-module-convergence";
import { HOME_HEADER_CUSTOMER_ASK_CHECKS } from "./customer-ask-home-header-convergence";
import { POST_REPAIR_SEARCH_RESULT_ROW_HTML } from "./customer-ask-search-follow-up-convergence";
import { SEARCH_SURFACE_CUSTOMER_ASK_CHECKS } from "./customer-ask-search-surface-convergence";
import { TAG_LIST_CUSTOMER_ASK_CHECKS } from "./customer-ask-tag-list-convergence";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

const GQA_URL = PHASE_1_GROUPED_QUERY_ATTENTION_URL;
const TOKEN_URL = "/docs/glossary/token";

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

function createConvergenceStubServer(
  htmlByPath: Record<string, string>,
  apiResultsByQuery: Record<
    string,
    Array<{ url: string }>
  > = CUSTOMER_ASK_PASSING_API_RESULTS,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = requestUrl.pathname;

    if (path === "/api/search") {
      const query = requestUrl.searchParams.get("query") ?? "";
      const hits = apiResultsByQuery[query] ?? [];
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(hits));
      return;
    }

    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

function passingDocsFooterOptions() {
  return {
    readBundledAppCss: () => CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS,
  };
}

function passingSearchSurfaceOptions() {
  return {
    queries: ["GQA"] as const,
    runSearchPageQueryCheck: async () => ({
      resultUrls: [GQA_URL, TOKEN_URL],
      matchedTagsVisible: false,
      hasResults: true,
      hasEmpty: false,
      firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
    }),
    runSearchDialogQueryCheck: async () => ({
      resultUrls: [GQA_URL],
      matchedTagsVisible: false,
      hasResults: true,
      hasEmpty: false,
      firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
    }),
    fetchApiGqaResults: async () => ({
      results: [{ url: GQA_URL }, { url: TOKEN_URL }],
    }),
  };
}

describe("runCustomerAskConvergenceChecks", () => {
  test("returns all pass rows on the post-repair customer-ask stub bundle", async () => {
    const httpServer = createConvergenceStubServer(
      CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          homeHeaderOptions: {
            runCommandKAffordanceProbe: async () => null,
          },
          searchSurfaceOptions: passingSearchSurfaceOptions(),
          docsFooterOptions: passingDocsFooterOptions(),
        },
      );

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(getCustomerAskConvergenceExitCode(rows)).toBe(0);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports home/header fail evidence on pre-repair home HTML", async () => {
    const httpServer = createConvergenceStubServer({
      ...CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
      "/": CUSTOMER_ASK_PRE_REPAIR_HOME_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          searchSurfaceOptions: passingSearchSurfaceOptions(),
          docsFooterOptions: passingDocsFooterOptions(),
        },
      );

      const failing = rows.filter((row) => row.status === "fail");
      expect(
        failing.some(
          (row) =>
            row.checkId ===
            HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry.checkId,
        ),
      ).toBe(true);
      expect(getCustomerAskConvergenceExitCode(rows)).toBe(1);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports tag list fail evidence on pre-repair /tags HTML", async () => {
    const httpServer = createConvergenceStubServer({
      ...CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
      "/tags": CUSTOMER_ASK_PRE_REPAIR_TAGS_INDEX_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          searchSurfaceOptions: passingSearchSurfaceOptions(),
          docsFooterOptions: passingDocsFooterOptions(),
        },
      );

      expect(
        rows.some(
          (row) =>
            row.checkId ===
              TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId &&
            row.status === "fail",
        ),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports search surface fail evidence from injected pre-repair probes", async () => {
    const httpServer = createConvergenceStubServer(
      CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          homeHeaderOptions: {
            runCommandKAffordanceProbe: async () => null,
          },
          searchSurfaceOptions: {
            queries: ["attention"],
            runSearchPageQueryCheck: async () => ({
              resultUrls: [`${GQA_URL}#compute-flow`],
              matchedTagsVisible: true,
              hasResults: true,
              hasEmpty: false,
            }),
            runSearchDialogQueryCheck: async () => ({
              resultUrls: [GQA_URL],
              matchedTagsVisible: false,
              hasResults: true,
              hasEmpty: false,
            }),
            fetchApiGqaResults: async () => ({
              results: [{ url: `${GQA_URL}#section` }],
            }),
          },
          docsFooterOptions: passingDocsFooterOptions(),
        },
      );

      expect(
        rows.some(
          (row) =>
            row.checkId ===
              SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId &&
            row.status === "fail",
        ),
      ).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.checkId ===
              SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId &&
            row.status === "fail",
        ),
      ).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.checkId ===
              SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.apiGqaCanonicalFirstHit
                .checkId && row.status === "fail",
        ),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports glossary fail evidence on pre-repair glossary HTML", async () => {
    const httpServer = createConvergenceStubServer({
      ...CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
      "/docs/glossary/token": CUSTOMER_ASK_PRE_REPAIR_GLOSSARY_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          searchSurfaceOptions: passingSearchSurfaceOptions(),
          docsFooterOptions: passingDocsFooterOptions(),
        },
      );

      expect(
        rows.some(
          (row) =>
            row.checkId === GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId &&
            row.status === "fail",
        ),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports GQA module fail evidence on pre-repair module HTML", async () => {
    const httpServer = createConvergenceStubServer({
      ...CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
      [GQA_URL]: CUSTOMER_ASK_PRE_REPAIR_GQA_MODULE_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskConvergenceChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          searchSurfaceOptions: passingSearchSurfaceOptions(),
          docsFooterOptions: passingDocsFooterOptions(),
        },
      );

      expect(
        rows.some(
          (row) =>
            row.checkId ===
              GQA_MODULE_CUSTOMER_ASK_CHECKS.presentation.checkId &&
            row.status === "fail",
        ),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});

describe("runPhase1CustomerAskConvergenceVerification", () => {
  test("prints customer-ask report and returns pass when Phase 1 and customer-ask stubs pass", async () => {
    const httpServer = createConvergenceStubServer(
      buildPhase1AndCustomerAskPassingStubHtml(),
    );
    const port = await listenOnEphemeralPort(httpServer);
    const lines: string[] = [];

    try {
      const result = await runPhase1CustomerAskConvergenceVerification(
        `http://127.0.0.1:${port}`,
        {
          phase1UxOptions: {
            convergenceOptions: {
              docsShellOptions: { timeoutMs: 2_000 },
              homeSearchEntryOptions: { timeoutMs: 2_000 },
              readerConvergenceOptions: {
                readerRouteOptions: { timeoutMs: 2_000 },
                tagsNavigationOptions: { timeoutMs: 2_000 },
              },
            },
            routeOptions: { timeoutMs: 2_000 },
            searchOptions: { timeoutMs: 2_000 },
            searchPageOptions: { runQueryCheck: async () => null },
            searchDialogOptions: { runQueryCheck: async () => null },
            searchShortcutOptions: { runShortcutCheck: async () => null },
          },
          customerAskOptions: {
            timeoutMs: 2_000,
            homeHeaderOptions: {
              runCommandKAffordanceProbe: async () => null,
            },
            searchSurfaceOptions: passingSearchSurfaceOptions(),
            docsFooterOptions: passingDocsFooterOptions(),
          },
          printReport: { writeLine: (line) => lines.push(line) },
        },
      );

      expect(result.phase1UxPassed).toBe(true);
      expect(result.customerAskExitCode).toBe(0);
      expect(lines[0]).toBe(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER);
      expect(result.customerAskRows.every((row) => row.status === "pass")).toBe(
        true,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("prints customer-ask report when Phase 1 UX fails", async () => {
    const httpServer = createConvergenceStubServer({
      ...buildPhase1AndCustomerAskPassingStubHtml(),
      "/docs/architecture": `<html><header><nav aria-label="Primary">Model Atlas</nav></header><article>split shell</article></html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const lines: string[] = [];

    try {
      const result = await runPhase1CustomerAskConvergenceVerification(
        `http://127.0.0.1:${port}`,
        {
          phase1UxOptions: {
            convergenceOptions: {
              docsShellOptions: { timeoutMs: 2_000 },
              homeSearchEntryOptions: { timeoutMs: 2_000 },
              readerConvergenceOptions: {
                readerRouteOptions: { timeoutMs: 2_000 },
                tagsNavigationOptions: { timeoutMs: 2_000 },
              },
            },
            routeOptions: { timeoutMs: 2_000 },
            searchOptions: { timeoutMs: 2_000 },
            searchPageOptions: { runQueryCheck: async () => null },
            searchDialogOptions: { runQueryCheck: async () => null },
            searchShortcutOptions: { runShortcutCheck: async () => null },
          },
          customerAskOptions: {
            timeoutMs: 2_000,
            homeHeaderOptions: {
              runCommandKAffordanceProbe: async () => null,
            },
            searchSurfaceOptions: passingSearchSurfaceOptions(),
            docsFooterOptions: passingDocsFooterOptions(),
          },
          printReport: { writeLine: (line) => lines.push(line) },
        },
      );

      expect(result.phase1UxPassed).toBe(false);
      expect(lines[0]).toBe(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER);
      expect(lines.length).toBeGreaterThan(1);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
