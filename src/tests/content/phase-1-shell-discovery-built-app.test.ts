import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  assertBuiltAppRouteHtml,
  readBuiltAppServerHtml,
} from "@/lib/build/built-app-html-test-utils";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  loadPhase1AttentionModuleUrls,
  PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL,
  publishedResourceMatchesTag,
} from "@/lib/content/phase-1-published-resources";
import { loadRegistry } from "@/lib/content/registry";
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

const REPRESENTATIVE_ATTENTION_SEARCH_CONTRACTS = [
  {
    query: "GQA",
    url: PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL,
  },
  {
    query: "attention",
    url: "/docs/modules/attention",
  },
  {
    query: "sliding window attention",
    url: "/docs/modules/sliding-window-attention",
  },
] as const;

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
  test(
    "representative attention search queries surface published module routes from discovery helpers",
    async () => {
      const indexes = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const pageByUrl = new Map(pages.map((page) => [page.url, page]));
      const moduleUrls = new Set(await loadPhase1AttentionModuleUrls("en"));

      for (const contract of REPRESENTATIVE_ATTENTION_SEARCH_CONTRACTS) {
        const page = pageByUrl.get(contract.url);
        expect(
          page,
          `missing published page for representative route ${contract.url}`,
        ).toBeDefined();
        if (!page) {
          throw new Error(
            `missing published page for representative route ${contract.url}`,
          );
        }
        expect(
          moduleUrls.has(contract.url),
          `${contract.url} should resolve as a published attention module`,
        ).toBe(true);
        expect(
          publishedResourceMatchesTag(page, "attention", indexes),
          `${contract.url} should match the attention discovery tag`,
        ).toBe(true);

        const results = await docsSearchApi.search(contract.query);
        expect(
          results.some(
            (result) =>
              result.url === contract.url ||
              result.url.startsWith(`${contract.url}#`),
          ),
          `query "${contract.query}" should surface ${contract.url}`,
        ).toBe(true);
      }
    },
    { timeout: 20_000 },
  );

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
