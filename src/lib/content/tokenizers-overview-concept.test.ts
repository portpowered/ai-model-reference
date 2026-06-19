import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("tokenizers overview concept page", () => {
  test("publishes concept.tokenizers-overview as a canonical docs page", async () => {
    const record = getConceptById("concept.tokenizers-overview");
    const pages = await loadPublishedDocsPages("en");

    expect(record?.status).toBe("published");
    expect(record?.conceptType).toBe("general");
    expect(record?.prerequisiteIds).toEqual(["concept.token"]);
    expect(
      pages.some(
        (page) => page.frontmatter.registryId === "concept.tokenizers-overview",
      ),
    ).toBe(true);
  });

  test("curated related links expose glossary neighbors and tokenizer families in registry order", () => {
    const source = getConceptById("concept.tokenizers-overview");
    if (!source) {
      throw new Error("expected concept.tokenizers-overview in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.map((item) => item.registryId)).toEqual(source.relatedIds);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      "/docs/glossary/embedding",
      "/docs/glossary/vocabulary-size",
      "/docs/glossary/special-tokens",
      "/docs/modules/bpe",
      undefined,
      "/docs/modules/sentencepiece",
      "/docs/modules/byte-level-tokenization",
    ]);
  });

  test("page renders the canonical route with tokenizer overview copy and nearby links", async () => {
    const page = await loadConceptPage("tokenizers-overview");

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.tokenizers-overview");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "before embeddings and attention begin",
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
    expect(html).toContain("How It Affects Requests");
    expect(html).toContain("Algorithm Families");
    expect(html).toContain("front door to a language model");
    expect(html).toContain("context budget");
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/glossary/vocabulary-size"');
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('href="/docs/modules/sentencepiece"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain("WordPiece");
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain('id="simple-example"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});
