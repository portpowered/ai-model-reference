/**
 * Consolidated review-facing slice proof for the temperature concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and related-link behavior together.
 */
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.temperature";
const PAGE_URL = "/docs/concepts/temperature";
const pageDir = getDocsPageDir("concepts", "temperature");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

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
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "temperature",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("temperature");
    expect(record?.citationIds).toEqual([
      "citation.curious-case-neural-text-degeneration",
      "citation.brown-gpt-3",
    ]);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets).toEqual({});
  });

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
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.temperature in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

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
    expect(related.length).toBeGreaterThan(0);

    for (const query of [
      "Temperature",
      "sampling temperature",
      "softmax temperature",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
