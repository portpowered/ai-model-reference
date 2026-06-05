import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

const PHASE_1_SHELL_ROUTES = [
  {
    path: "/docs/architecture",
    file: ".next/server/app/docs/architecture.html",
  },
  {
    path: "/docs/glossary",
    file: ".next/server/app/docs/glossary.html",
  },
  {
    path: "/docs/glossary/token",
    file: ".next/server/app/docs/glossary/token.html",
    tocAnchor: { anchorId: "what-it-is", label: "What It Is" },
  },
  {
    path: "/docs/modules/grouped-query-attention",
    file: ".next/server/app/docs/modules/grouped-query-attention.html",
    tocAnchor: { anchorId: "how-it-works", label: "How It Works" },
  },
] as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  const absolutePath = join(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, "utf8");
}

function assertSharedShellMarkers(visibleHtml: string): void {
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
}

describe("Phase 1 docs shell contract (built HTML)", () => {
  for (const route of PHASE_1_SHELL_ROUTES) {
    test(`${route.path} exposes unified shell markers and populated sidebar`, () => {
      const html = readBuiltRouteHtml(route.file);
      if (!html) {
        return;
      }

      const visibleHtml = stripHtmlScripts(html);
      assertSharedShellMarkers(visibleHtml);

      if ("tocAnchor" in route) {
        const toc = extractNdTocHtml(visibleHtml);
        expect(toc.length).toBeGreaterThan(0);
        expect(tocHtmlIncludesAnchor(toc, route.tocAnchor.anchorId)).toBe(true);
        expect(toc).toContain(route.tocAnchor.label);
      }
    });
  }

  test("legacy placeholder sidebar fixture fails the split-layout regression guard", () => {
    const legacyHtml = stripHtmlScripts(`
      <header><nav aria-label="Primary">Home</nav></header>
      <aside aria-label="Docs sidebar">
        <p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p>
      </aside>
      <article>Index content</article>
    `);

    expect(hasLegacyPlaceholderSidebar(legacyHtml)).toBe(true);
    expect(legacyHtml).not.toContain('id="nd-sidebar"');
    expect(legacyHtml).not.toContain(TOKEN_GLOSSARY_URL);
  });
});
