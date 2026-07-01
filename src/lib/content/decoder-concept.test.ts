import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("decoder concept page (decoder-concept-page-002)", () => {
  test("publishes the canonical decoder concept route with the existing registry record", () => {
    const record = getConceptById("concept.decoder");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "Decoder",
        "decoder stack",
        "decoder-only stack",
        "decoding network",
      ]),
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.decoder")).toBe(true);
  });

  test("curated related links resolve to the decoder's nearby generation and architecture pages", () => {
    const source = getConceptById("concept.decoder");
    if (!source) {
      throw new Error("expected concept.decoder in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.encoder-decoder")?.href,
    ).toBe("/docs/glossary/encoder-decoder");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "module.causal-attention")?.href,
    ).toBe("/docs/modules/causal-attention");
    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
    expect(
      items.find((item) => item.registryId === "paper.gpt-2-report")?.href,
    ).toBe("/docs/papers/gpt-2-report");
  });

  test("page renders the canonical concept route with decoder-only and architecture comparison copy", async () => {
    const page = await loadConceptPage("decoder");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.decoder");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "predicts the next token",
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
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Why Decoder-Only Fits Next-Token Generation");
    expect(html).toContain("Compared With Encoder And Encoder-Decoder Models");
    expect(html).toContain("causal attention");
    expect(html).toContain("decoder-only transformer uses left-to-right");
    expect(html).toContain("encoder-only model");
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/modules/causal-attention"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/docs/papers/gpt-2-report"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search discovery prefers the canonical decoder concept route for broad decoder queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const conceptDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/decoder",
    );
    expect(conceptDocument?.aliases).toEqual(
      expect.arrayContaining([
        "Decoder",
        "decoder stack",
        "decoder-only stack",
        "decoding network",
      ]),
    );

    for (const query of ["decoder-only stack", "decoding network"] as const) {
      const results = await docsSearchApi.search(query);
      expect(results[0]?.url).toBe("/docs/concepts/decoder");
    }
  });
});
