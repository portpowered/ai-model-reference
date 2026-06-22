import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { renderConceptDocsShell } from "@/lib/content/concept-shell-render";
import { stripHtmlTags } from "@/lib/content/glossary-test-helpers";
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

describe("Autoregressive generation concept page", () => {
  test("canonical concept route is published for the existing registry record", () => {
    const record = getConceptById("concept.autoregressive-generation");

    expect(record?.status).toBe("published");
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(
        "concept.autoregressive-generation",
      ),
    ).toBe(true);
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.decoder",
        "concept.encoder-decoder",
        "concept.kv-cache",
        "concept.prefill",
        "concept.prefill-decode-split",
        "concept.sampling-overview",
      ]),
    );
  });

  test("curated related items route the concept toward serving and token-chain neighbors", () => {
    const source = getConceptById("concept.autoregressive-generation");
    if (!source) {
      throw new Error("expected concept.autoregressive-generation in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.decoder")?.href,
    ).toBe("/docs/glossary/decoder");
    expect(
      items.find((item) => item.registryId === "concept.encoder-decoder")?.href,
    ).toBe("/docs/glossary/encoder-decoder");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/glossary/kv-cache");
    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/glossary/prefill");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/glossary/prefill-decode-split");
  });

  test("page renders the token loop, serving bridge, and related links", async () => {
    const page = await loadConceptPage("autoregressive-generation");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "concept.autoregressive-generation",
    );
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "next-token loop",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("One Token At A Time");
    expect(html).toContain("From Architecture To Serving");
    expect(html).toContain("diffusion-style generation");
    expect(html).toContain('href="/docs/glossary/decoder"');
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
  });

  test("shell render includes the folded summary and all expected references", async () => {
    const page = await loadConceptPage("autoregressive-generation");

    const html = renderConceptDocsShell(page);
    const plainHtml = stripHtmlTags(html);

    expect(html).toContain('data-testid="folded-opening-summary"');
    expect(plainHtml).toContain("Summary");
    expect(plainHtml).toContain(
      "Autoregressive generation is the step-by-step next-token loop",
    );
    expect(html).toContain('data-testid="citation-list"');
    expect(plainHtml).toContain("Attention Is All You Need");
    expect(plainHtml).toContain("Language Models are Unsupervised");
    expect(plainHtml).toContain(
      "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
    );
  });

  test("discovery publishes both the concept explainer and glossary bridge for autoregressive generation", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const conceptDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/autoregressive-generation",
    );
    const glossaryDocument = documents.find(
      (entry) => entry.url === "/docs/glossary/autoregressive-generation",
    );

    expect(conceptDocument?.registryId).toBe(
      "concept.autoregressive-generation",
    );
    expect(conceptDocument?.kind).toBe("concept");
    expect(conceptDocument?.facets.kind).toBe("concept");
    expect(glossaryDocument?.registryId).toBe(
      "concept.autoregressive-generation",
    );
    expect(glossaryDocument?.kind).toBe("glossary");
    expect(glossaryDocument?.facets.kind).toBe("glossary");

    const results = await docsSearchApi.search("next-token loop");
    expect(
      results.some(
        (result) => result.url === "/docs/concepts/autoregressive-generation",
      ),
    ).toBe(true);
  });
});
