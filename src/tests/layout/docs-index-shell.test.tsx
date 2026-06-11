import { describe, expect, test } from "bun:test";
import {
  extractNdSidebarHtml,
  hasLegacyPlaceholderSidebar,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  stripHtmlScripts,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

const BUILT_HTML_INDEX_ROUTES = [
  {
    path: "/docs/architecture",
    file: ".next/server/app/docs/architecture.html",
    title: "Architecture",
    entryHref: TOKEN_GLOSSARY_URL,
  },
  {
    path: "/docs/glossary",
    file: ".next/server/app/docs/glossary.html",
    title: "Glossary",
    entryHref: "/docs/glossary/embedding",
  },
] as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  return readBuiltHtmlForConvergenceTests(relativePath);
}

describe("docs index routes unified shell (built HTML)", () => {
  for (const route of BUILT_HTML_INDEX_ROUTES) {
    test(`${route.path} shares canonical shell chrome and index article content`, () => {
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
      expect(visibleHtml).toContain(TOKEN_GLOSSARY_URL);
      expect(visibleHtml).not.toContain(PLACEHOLDER_SIDEBAR_DESCRIPTION);
      expect(hasLegacyPlaceholderSidebar(visibleHtml)).toBe(false);
      expect(visibleHtml).toContain(route.title);
      expect(visibleHtml).toContain(route.entryHref);
    });
  }
});
