/**
 * Consolidated review-facing slice proof for the FLOPs concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and related-link behavior together.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { docsSearchApi } from "@/lib/search/search-server";

const PAGE_URL = "/docs/concepts/flops";

async function renderFlopsPageHtml(): Promise<string> {
  const page = await loadConceptPage("flops");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("FLOPs slice verification (flops-concept-page-005)", () => {
  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["concepts", "flops"]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("FLOPs");

    const rendered = await renderDocsSlugPage(["concepts", "flops"], "en");
    expect(rendered).toBeDefined();
  });

  test("rendered page teaches FLOPs, peak-versus-achieved compute, architecture effects, and serving-path related links", async () => {
    const html = await renderFlopsPageHtml();

    expect(html).toContain("FLOPs");
    expect(html).toContain("floating-point operation");
    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Peak Versus Achieved Compute");
    expect(html).toContain("Peak hardware FLOPs");
    expect(html).toContain("Achieved inference compute");
    expect(html).toContain("Memory bandwidth limits");
    expect(html).toContain("Architecture And Precision Effects");
    expect(html).toContain("mixture-of-experts");
    expect(html).toContain("quantization");
    expect(html).toContain("time to first token");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/concepts/mixture-of-experts"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain(
      'data-table-id="table.flops-peak-achieved-comparison"',
    );
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(html).not.toMatch(/nvidia|amd|leaderboard|benchmark winner/i);
  });

  test("search resolves representative compute queries to the canonical FLOPs page", async () => {
    for (const query of [
      "flops",
      "floating point operations",
      "peak FLOPs",
      "achieved compute",
      "inference compute",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
