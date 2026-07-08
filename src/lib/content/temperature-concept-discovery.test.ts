import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const TEMPERATURE_CONCEPT_URL = "/docs/concepts/temperature";
const pageDir = getDocsPageDir("concepts", "temperature");

setDefaultTimeout(30_000);

describe("temperature concept discovery (temperature-concept-page-current-main)", () => {
  test("registry routes temperature to the concept section", () => {
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.temperature"),
    ).toBe(true);

    const record = getConceptById("concept.temperature");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(
      expect.arrayContaining(["sampling temperature", "softmax temperature"]),
    );
  });

  test("search document for the concept page carries canonical aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === TEMPERATURE_CONCEPT_URL,
    );

    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["sampling temperature", "softmax temperature"]),
    );
    expect(document?.registryId).toBe("concept.temperature");
  });

  test("live search routes Temperature to the canonical concept page", async () => {
    const results = await docsSearchApi.search("Temperature");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(TEMPERATURE_CONCEPT_URL);
  });

  test("page bundle resolves from getDocsPageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(TEMPERATURE_CONCEPT_URL);
    expect(page?.frontmatter.registryId).toBe("concept.temperature");
  });

  test("curated related links point to softmax and sampling neighbors", () => {
    const source = getConceptById("concept.temperature");
    if (!source) {
      throw new Error("expected concept.temperature in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const hrefById = Object.fromEntries(
      items.map((item) => [item.registryId, item.href]),
    );

    expect(hrefById["concept.softmax"]).toBe("/docs/glossary/softmax");
    expect(hrefById["concept.entropy"]).toBe("/docs/glossary/entropy");
    expect(hrefById["concept.sampling-overview"]).toBe(
      "/docs/glossary/sampling-overview",
    );
    expect(hrefById["concept.greedy-decoding"]).toBe(
      "/docs/glossary/greedy-decoding",
    );
    expect(hrefById["concept.top-k-sampling"]).toBe(
      "/docs/glossary/top-k-sampling",
    );
    expect(hrefById["concept.top-p-sampling"]).toBe(
      "/docs/glossary/top-p-sampling",
    );
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["concepts", "temperature"]);
    expect(metadata.alternates).toEqual({
      canonical: TEMPERATURE_CONCEPT_URL,
      languages: {
        en: TEMPERATURE_CONCEPT_URL,
      },
    });
    expect(metadata.title).toContain("Temperature");

    const rendered = await renderDocsSlugPage(
      ["concepts", "temperature"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes decoding teaching, sampling neighbors, tags, and links", async () => {
    const page = await loadConceptPage("temperature");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Lower Temperature");
    expect(html).toContain("Higher Temperature");
    expect(html).toContain("Tradeoffs And Limits");
    expect(html).toContain("Sampling Neighbors");
    expect(html.toLowerCase()).toContain("softmax(z / t)");
    expect(html.toLowerCase()).toContain("does not change model");
    expect(html.toLowerCase()).toContain("stored knowledge");
    expect(html.toLowerCase()).toContain("inherently more truthful");
    expect(html.toLowerCase()).toContain("sharper");
    expect(html.toLowerCase()).toContain("spreads across");
    expect(html).toContain('href="/docs/glossary/parameter"');
    expect(html.toLowerCase()).toContain("temperature 0");
    expect(html.toLowerCase()).toContain("argmax");
    expect(html.toLowerCase()).toContain("incoherent");
    expect(html.toLowerCase()).toContain("appearance of confidence");
    expect(html.toLowerCase()).toContain("reshapes scores first");
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/glossary/entropy"');
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('href="/docs/glossary/greedy-decoding"');
    expect(html).toContain('href="/docs/glossary/top-k-sampling"');
    expect(html).toContain('href="/docs/glossary/top-p-sampling"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);

    const results = await docsSearchApi.search("sampling temperature");
    expect(
      results.some((result) => result.url === TEMPERATURE_CONCEPT_URL),
    ).toBe(true);
  });
});
