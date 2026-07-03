/**
 * Consolidated review-facing slice proof for the memory bandwidth concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and related-link behavior together.
 */
import { describe, expect, test } from "bun:test";
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
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.memory-bandwidth";
const SLUG = "memory-bandwidth";
const PAGE_URL = "/docs/concepts/memory-bandwidth";
const pageDir = getDocsPageDir("concepts", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderMemoryBandwidthPageHtml(): Promise<string> {
  const page = await loadConceptPage(SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("memory bandwidth slice verification (memory-bandwidth-concept-page-005)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: SLUG,
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
      section: "concepts",
    });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe(SLUG);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets).toEqual({});
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "memory-bandwidth",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Memory bandwidth");

    const rendered = await renderDocsSlugPage(
      ["concepts", "memory-bandwidth"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("curated related links resolve to published neighbors without planned placeholders", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.memory-bandwidth in registry");
    }

    const related = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(related.length).toBeGreaterThan(0);
    for (const item of related) {
      expect(item.isPlanned).toBe(false);
      expect(item.href).toBeDefined();
      expect(item.href?.startsWith("/docs/")).toBe(true);
      expect(getPublishedDocsEntryByRegistryId(item.registryId)?.url).toBe(
        item.href,
      );
    }
  });

  test("rendered page exposes tags, serving neighbors, and search aliases", async () => {
    const html = await renderMemoryBandwidthPageHtml();

    expect(html.toLowerCase()).toContain("memory bandwidth");
    expect(html).toContain("movement rate");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/concepts/weight-only-quantization"');
    expect(html).toContain('href="/docs/concepts/kv-cache-quantization"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(html).not.toContain("missing-message");
    expect(html).not.toContain("missing-content");

    for (const query of [
      "memory bandwidth",
      "serving memory bandwidth",
      "KV cache bandwidth",
      "throughput ceiling",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
