import { describe, expect, test } from "bun:test";
import {
  extractNdTocHtml,
  tocHtmlIncludesAnchor,
} from "@/lib/navigation/docs-page-toc-contract";
import {
  extractNdSidebarHtml,
  hasLegacyPlaceholderSidebar,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  stripHtmlScripts,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";
import { assertSearchPageBuiltAppShell } from "@/lib/verify/phase-1-search-built-app-shell-checks";
import { shouldRunBuiltHtmlConvergenceTests } from "@/lib/verify/server-lifecycle";

const BUILT_HTML_SITE_ROUTES = [
  {
    path: "/",
    file: ".next/server/app/index.html",
    contentMarker: "Model Atlas",
    alsoExpectInHtml: TOKEN_GLOSSARY_URL,
    tocAnchor: { anchorId: "browse", label: "Browse" },
    tocMustNotIncludeAnchor: "search",
  },
  {
    path: "/search",
    file: ".next/server/app/search.html",
    contentMarker: "Search Model Atlas",
  },
  {
    path: "/tags",
    file: ".next/server/app/tags.html",
    contentMarker: 'href="/tags/attention"',
  },
  {
    path: "/tags/attention",
    file: ".next/server/app/tags/attention.html",
    contentMarker: 'href="/docs/modules/grouped-query-attention"',
    alsoExpectInHtml: TOKEN_GLOSSARY_URL,
  },
] as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  return readBuiltHtmlForConvergenceTests(relativePath);
}

describe("Phase 1 site routes unified shell (built HTML)", () => {
  if (!shouldRunBuiltHtmlConvergenceTests()) {
    test("skips built HTML probes during coverage subprocess rerun", () => {});
    return;
  }

  for (const route of BUILT_HTML_SITE_ROUTES) {
    test(`${route.path} shares canonical shell chrome and route content`, () => {
      const html = readBuiltRouteHtml(route.file);
      if (!html) {
        return;
      }

      const visibleHtml = stripHtmlScripts(html);
      const sidebar = extractNdSidebarHtml(visibleHtml);

      expect(visibleHtml).toContain('aria-label="Primary"');
      expect(visibleHtml).toContain('id="nd-sidebar"');
      expect(visibleHtml).toContain('id="nd-page"');
      expect(sidebar.length).toBeGreaterThan(0);
      expect(sidebar).toContain(">Modules<");
      expect(sidebar).toContain(">Glossary<");
      if ("alsoExpectInHtml" in route) {
        expect(visibleHtml).toContain(route.alsoExpectInHtml);
      }
      expect(visibleHtml).not.toContain(PLACEHOLDER_SIDEBAR_DESCRIPTION);
      expect(hasLegacyPlaceholderSidebar(visibleHtml)).toBe(false);
      expect(visibleHtml).toContain(route.contentMarker);

      if (route.path === "/search") {
        expect(assertSearchPageBuiltAppShell(visibleHtml)).toBeNull();
      }

      if ("tocAnchor" in route) {
        const toc = extractNdTocHtml(visibleHtml);
        expect(toc.length).toBeGreaterThan(0);
        expect(tocHtmlIncludesAnchor(toc, route.tocAnchor.anchorId)).toBe(true);
        expect(toc).toContain(route.tocAnchor.label);
      }
      if ("tocMustNotIncludeAnchor" in route) {
        const toc = extractNdTocHtml(visibleHtml);
        expect(tocHtmlIncludesAnchor(toc, route.tocMustNotIncludeAnchor)).toBe(
          false,
        );
      }
    });
  }
});
