import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";

const FOLDED_SUMMARY_MARKERS = [
  'data-testid="folded-summary"',
  'data-folded-summary="true"',
  'data-opening-summary="folded"',
] as const;

describe("page shell folded summary", () => {
  for (const slug of ["grouped-query-attention", "attention"] as const) {
    test(`${slug} module renders one folded opening summary near the top`, async () => {
      const page = await loadModulePage(slug);
      const html = renderModuleDocsShell(page);

      for (const marker of FOLDED_SUMMARY_MARKERS) {
        expect(html).toContain(marker);
      }

      const foldedIndex = html.indexOf('data-testid="folded-summary"');
      const atAGlanceIndex = html.indexOf('aria-label="At a glance"');
      const whatItIsIndex = html.indexOf('id="what-it-is"');

      expect(foldedIndex).toBeGreaterThanOrEqual(0);
      if (atAGlanceIndex >= 0) {
        expect(foldedIndex).toBeLessThan(atAGlanceIndex);
      }
      if (whatItIsIndex >= 0) {
        expect(foldedIndex).toBeLessThan(whatItIsIndex);
      }
    });
  }

  test("module article content renders folded summary inside providers", async () => {
    const page = await loadModulePage("attention");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="folded-summary"');
    expect(html).not.toContain('<T k="openingSummary"');
  });
});
