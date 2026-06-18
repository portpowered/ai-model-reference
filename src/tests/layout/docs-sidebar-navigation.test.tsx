import { describe, expect, test } from "bun:test";
import {
  collectSidebarPageLinks,
  extractNdSidebarHtml,
  findSidebarPageLink,
  GROUPED_QUERY_ATTENTION_URL,
  hasLegacyPlaceholderSidebar,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  stripHtmlScripts,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { source } from "@/lib/source";
import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

const BUILT_HTML_DOC_ROUTES = [
  {
    path: "/docs/glossary/token",
    file: ".next/server/app/docs/glossary/token.html",
    requiredSidebarUrls: [TOKEN_GLOSSARY_URL],
  },
  {
    path: "/docs/modules/grouped-query-attention",
    file: ".next/server/app/docs/modules/grouped-query-attention.html",
    requiredSidebarUrls: [GROUPED_QUERY_ATTENTION_URL],
  },
] as const;

const BUILT_HTML_LOCALIZED_DOC_ROUTES = [
  {
    path: "/vi/docs/modules/grouped-query-attention",
    file: ".next/server/app/vi/docs/modules/grouped-query-attention.html",
    requiredSidebarUrls: [
      "/vi/docs/modules/grouped-query-attention",
      "/vi/docs/modules/linear-attention",
      "/vi/docs/modules/multi-head-attention",
      "/vi/docs/modules/multi-query-attention",
      "/vi/docs/modules/sliding-window-attention",
    ],
    forbiddenSidebarUrls: [
      "/vi/docs/getting-started",
      "/vi/docs/modules/multi-head-latent-attention",
      "/vi/docs/modules/sparse-attention",
    ],
  },
] as const;

const BUILT_HTML_INDEX_ROUTES = [
  {
    path: "/docs/architecture",
    file: ".next/server/app/docs/architecture.html",
  },
  {
    path: "/docs/glossary",
    file: ".next/server/app/docs/glossary.html",
  },
] as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  return readBuiltHtmlForConvergenceTests(relativePath);
}

describe("docs sidebar page-tree contract", () => {
  test("page tree includes Token and Grouped-Query Attention reader URLs", () => {
    const links = collectSidebarPageLinks(source.pageTree);
    const token = findSidebarPageLink(links, TOKEN_GLOSSARY_URL);
    const gqa = findSidebarPageLink(links, GROUPED_QUERY_ATTENTION_URL);

    expect(token?.name).toBe("Token");
    expect(gqa?.name).toBe("Grouped-Query Attention");
  });

  test("page tree includes sidebar subheadings for module and glossary traversal", () => {
    const sidebarJson = JSON.stringify(source.pageTree);

    expect(sidebarJson).toContain("Attention Foundations");
    expect(sidebarJson).toContain("Attention Variants");
    expect(sidebarJson).toContain("Model Taxonomy");
    expect(sidebarJson).toContain("Sequence And Attention");
  });
});

describe("docs sidebar navigation (built HTML)", () => {
  for (const route of BUILT_HTML_DOC_ROUTES) {
    test(`${route.path} renders populated Fumadocs sidebar links`, () => {
      const html = readBuiltRouteHtml(route.file);
      if (!html) {
        return;
      }

      const visibleHtml = stripHtmlScripts(html);
      const sidebar = extractNdSidebarHtml(visibleHtml);

      expect(sidebar.length).toBeGreaterThan(0);
      for (const url of route.requiredSidebarUrls) {
        expect(visibleHtml).toContain(url);
      }
      expect(sidebar).not.toContain(PLACEHOLDER_SIDEBAR_DESCRIPTION);
      expect(hasLegacyPlaceholderSidebar(visibleHtml)).toBe(false);
    });
  }

  for (const route of BUILT_HTML_INDEX_ROUTES) {
    test(`${route.path} renders Fumadocs sidebar folders instead of placeholder nav`, () => {
      const html = readBuiltRouteHtml(route.file);
      if (!html) {
        return;
      }

      const visibleHtml = stripHtmlScripts(html);
      const sidebar = extractNdSidebarHtml(visibleHtml);

      expect(sidebar.length).toBeGreaterThan(0);
      expect(sidebar).toContain(">Modules<");
      expect(sidebar).toContain(">Glossary<");
      expect(visibleHtml).toContain(TOKEN_GLOSSARY_URL);
      expect(sidebar).not.toContain(PLACEHOLDER_SIDEBAR_DESCRIPTION);
      expect(hasLegacyPlaceholderSidebar(visibleHtml)).toBe(false);
    });
  }

  for (const route of BUILT_HTML_LOCALIZED_DOC_ROUTES) {
    test(`${route.path} omits broken localized docs links from the sidebar`, () => {
      const html = readBuiltRouteHtml(route.file);
      if (!html) {
        return;
      }

      const visibleHtml = stripHtmlScripts(html);
      const sidebar = extractNdSidebarHtml(visibleHtml);

      expect(sidebar.length).toBeGreaterThan(0);
      for (const url of route.requiredSidebarUrls) {
        expect(sidebar).toContain(url);
      }
      for (const url of route.forbiddenSidebarUrls) {
        expect(sidebar).not.toContain(url);
      }
    });
  }
});
