import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  assertBuiltAppRouteHtml,
  readBuiltAppServerHtml,
} from "@/lib/build/built-app-html-test-utils";
import {
  loadPhase1AttentionModuleUrls,
  PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL,
} from "@/lib/content/phase-1-published-resources";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  PHASE_1_SEARCH_ASSERTIONS,
  runPhase1SearchChecks,
} from "@/lib/verify/phase-1-search-checks";
import {
  acquireVerifyServerSession,
  shouldRunBuiltHtmlConvergenceTests,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

/** Shell-linked Phase 1 discovery routes checked against PHASE_1_ROUTE_ASSERTIONS. */
const PHASE_1_SHELL_DISCOVERY_ROUTES = [
  { route: "/", html: "index.html" },
  { route: "/search", html: "search.html" },
  { route: "/tags", html: "tags.html" },
  { route: "/tags/attention", html: "tags/attention.html" },
  { route: "/docs/architecture", html: "docs/architecture.html" },
  { route: "/docs/glossary", html: "docs/glossary.html" },
] as const;

describe("Phase 1 shell discovery built-app HTML", () => {
  if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
    test("skips built HTML probes during coverage subprocess rerun", () => {});
    return;
  }

  for (const entry of PHASE_1_SHELL_DISCOVERY_ROUTES) {
    test(`built ${entry.route} satisfies Phase 1 route assertions`, () => {
      const html = readBuiltAppServerHtml(entry.html, repoRoot);
      if (!html) {
        return;
      }

      const visibleHtml = stripHtmlScripts(html);
      const failureReason = assertBuiltAppRouteHtml(entry.route, visibleHtml);
      expect(failureReason).toBeNull();
    });
  }
});

describe("Phase 1 shell and search discovery alignment", () => {
  test("attention search API includes every canonical attention module URL from published-resource discovery", async () => {
    const moduleUrls = await loadPhase1AttentionModuleUrls("en");
    const results = await docsSearchApi.search("attention");

    expect(moduleUrls).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL);
    for (const moduleUrl of moduleUrls) {
      expect(
        results.some(
          (result) =>
            result.url === moduleUrl || result.url.startsWith(`${moduleUrl}#`),
        ),
      ).toBe(true);
    }
  });

  test("served built app attention search API includes grouped-query-attention", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    try {
      const failures = await runPhase1SearchChecks(session.baseUrl, {
        searches: PHASE_1_SEARCH_ASSERTIONS.filter(
          (search) => search.query === "attention",
        ),
      });
      expect(failures).toEqual([]);
    } finally {
      await session.cleanup();
    }
  }, 60_000);
});
