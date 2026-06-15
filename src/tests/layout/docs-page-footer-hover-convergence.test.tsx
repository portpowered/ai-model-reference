import { describe, expect, test } from "bun:test";
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
import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";
import { readBundledAppCss } from "@/lib/verify/bundled-app-css";
import { shouldRunBuiltHtmlConvergenceTests } from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

const TOKEN_GLOSSARY_ROUTE = {
  path: "/docs/glossary/token",
  file: ".next/server/app/docs/glossary/token.html",
} as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  return readBuiltHtmlForConvergenceTests(relativePath);
}

describe("docs page footer hover convergence (built HTML)", () => {
  test(`${TOKEN_GLOSSARY_ROUTE.path} footer cards include muted sublabels inside accent-hover anchors within #nd-page`, () => {
    if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
      return;
    }

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
    if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
      return;
    }

    const bundledCss = readBundledAppCss(process.cwd());
    if (!bundledCss) {
      return;
    }

    expect(bundledCssHasFooterSublabelInheritRule(bundledCss)).toBe(true);
  });
});
