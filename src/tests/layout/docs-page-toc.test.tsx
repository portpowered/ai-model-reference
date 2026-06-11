import { describe, expect, test } from "bun:test";
import {
  extractNdTocHtml,
  tocHtmlIncludesAnchor,
} from "@/lib/navigation/docs-page-toc-contract";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

const BUILT_HTML_DOC_ROUTES = [
  {
    path: "/docs/glossary/token",
    file: ".next/server/app/docs/glossary/token.html",
    anchorId: "what-it-is",
    label: "What It Is",
  },
  {
    path: "/docs/modules/grouped-query-attention",
    file: ".next/server/app/docs/modules/grouped-query-attention.html",
    anchorId: "how-it-works",
    label: "How It Works",
  },
] as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  return readBuiltHtmlForConvergenceTests(relativePath);
}

describe("docs page heading TOC (built HTML)", () => {
  for (const route of BUILT_HTML_DOC_ROUTES) {
    test(`${route.path} exposes right-rail TOC links to section headings`, () => {
      const html = readBuiltRouteHtml(route.file);
      if (!html) {
        return;
      }

      const visibleHtml = stripHtmlScripts(html);
      const toc = extractNdTocHtml(visibleHtml);

      expect(toc.length).toBeGreaterThan(0);
      expect(tocHtmlIncludesAnchor(toc, route.anchorId)).toBe(true);
      expect(toc).toContain(route.label);
    });
  }
});
