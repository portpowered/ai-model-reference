import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
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
import { readBundledAppCss } from "@/lib/verify/bundled-app-css";
import { runPhase1DocsFooterHoverChecks } from "@/lib/verify/phase-1-docs-footer-hover-checks";
import { acquireVerifyServerSession } from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

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
    const bundledCss = readBundledAppCss(process.cwd());
    if (!bundledCss) {
      return;
    }

    expect(bundledCssHasFooterSublabelInheritRule(bundledCss)).toBe(true);
  });

  test("production build footer cards invert sublabel foreground on hover and focus-visible", async () => {
    if (process.env.CI === "true") {
      return;
    }
    if (!readBuiltRouteHtml(TOKEN_GLOSSARY_ROUTE.file)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    try {
      const failures = await runPhase1DocsFooterHoverChecks(session.baseUrl);
      expect(failures).toEqual([]);
    } finally {
      await session.cleanup();
    }
  }, 60_000);
});
