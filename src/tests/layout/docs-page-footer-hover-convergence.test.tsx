import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bundledCssHasFooterSublabelInheritRule,
  extractFooterCardAnchorHtml,
  extractNdPageHtml,
  FOOTER_DIRECTIONAL_SUBLABELS,
  footerCardHasAccentHoverClasses,
  footerCardHasMutedDirectionalSublabel,
} from "@/lib/navigation/docs-page-footer-contract";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";

const TOKEN_GLOSSARY_ROUTE = {
  path: "/docs/glossary/token",
  file: ".next/server/app/docs/glossary/token.html",
} as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  const absolutePath = join(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, "utf8");
}

function readBundledAppCss(): string | null {
  const cssRoots = [
    join(process.cwd(), ".next/static/css"),
    join(process.cwd(), ".next/static/chunks"),
  ];

  const cssFiles = cssRoots.flatMap((root) => {
    if (!existsSync(root)) {
      return [];
    }

    return readdirSync(root)
      .filter((name) => name.endsWith(".css"))
      .map((name) => join(root, name));
  });

  if (cssFiles.length === 0) {
    return null;
  }

  return cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");
}

describe("docs page footer hover convergence (built HTML)", () => {
  test(`${TOKEN_GLOSSARY_ROUTE.path} footer cards include muted sublabels inside accent-hover anchors within #nd-page`, () => {
    const html = readBuiltRouteHtml(TOKEN_GLOSSARY_ROUTE.file);
    if (!html) {
      return;
    }

    const visibleHtml = stripHtmlScripts(html);
    const ndPageHtml = extractNdPageHtml(visibleHtml);

    expect(ndPageHtml.length).toBeGreaterThan(0);
    expect(ndPageHtml).toContain('id="nd-page"');

    for (const sublabel of Object.values(FOOTER_DIRECTIONAL_SUBLABELS)) {
      const footerCard = extractFooterCardAnchorHtml(ndPageHtml, sublabel);

      expect(footerCard.length).toBeGreaterThan(0);
      expect(footerCardHasAccentHoverClasses(footerCard)).toBe(true);
      expect(footerCardHasMutedDirectionalSublabel(footerCard, sublabel)).toBe(
        true,
      );
    }
  });

  test("bundled app CSS includes footer sublabel hover/focus inherit rule", () => {
    const bundledCss = readBundledAppCss();
    if (!bundledCss) {
      return;
    }

    expect(bundledCssHasFooterSublabelInheritRule(bundledCss)).toBe(true);
  });
});
