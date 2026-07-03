/**
 * Consolidated review-facing slice proof for the temperature concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and related-link behavior together.
 */
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { docsSearchApi } from "@/lib/search/search-server";

const PAGE_URL = "/docs/concepts/temperature";

setDefaultTimeout(30_000);

async function renderTemperaturePageHtml(): Promise<string> {
  const page = await loadConceptPage("temperature");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("temperature slice verification (temperature-concept-page-current-main-004)", () => {
  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["concepts", "temperature"]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Temperature");

    const rendered = await renderDocsSlugPage(
      ["concepts", "temperature"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes decoding teaching, sampling neighbors, tags, and search aliases", async () => {
    const html = await renderTemperaturePageHtml();

    expect(html.toLowerCase()).toContain("temperature");
    expect(html).toContain("Lower Temperature");
    expect(html).toContain("Higher Temperature");
    expect(html).toContain("Tradeoffs And Limits");
    expect(html).toContain("Sampling Neighbors");
    expect(html).toContain("softmax(z / T)");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/glossary/entropy"');
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('href="/docs/glossary/greedy-decoding"');
    expect(html).toContain('href="/docs/glossary/top-k-sampling"');
    expect(html).toContain('href="/docs/glossary/top-p-sampling"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);

    const results = await docsSearchApi.search("sampling temperature");
    expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
  });
});
