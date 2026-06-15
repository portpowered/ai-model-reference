import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryPresentationConvergence } from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { source } from "@/lib/source";

const TOKENIZER_ALGORITHM_PAGES = [
  {
    slug: "bpe",
    registryId: "concept.bpe",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "BPE",
  },
  {
    slug: "wordpiece",
    registryId: "concept.wordpiece",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "WordPiece",
  },
  {
    slug: "unigram-tokenizer",
    registryId: "concept.unigram-tokenizer",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "Unigram tokenizer",
  },
  {
    slug: "sentencepiece",
    registryId: "concept.sentencepiece",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "SentencePiece",
  },
  {
    slug: "byte-level-tokenization",
    registryId: "concept.byte-level-tokenization",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "Byte-level tokenization",
  },
] as const;

const TOKENIZER_CONFIG_PAGES = [
  {
    slug: "vocabulary-size",
    registryId: "concept.vocabulary-size",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "Vocabulary size",
  },
  {
    slug: "special-tokens",
    registryId: "concept.special-tokens",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "Special tokens",
  },
  {
    slug: "chat-templates",
    registryId: "concept.chat-templates",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "Chat templates",
  },
  {
    slug: "tokenizer-mismatch",
    registryId: "concept.tokenizer-mismatch",
    foundationHref: "/docs/concepts/tokenizers-overview",
    searchTitle: "Tokenizer mismatch",
  },
] as const;

const ALL_GLOSSARY_PAGES = [
  ...TOKENIZER_ALGORITHM_PAGES,
  ...TOKENIZER_CONFIG_PAGES,
] as const;

describe("Phase 3 tokenizer foundation pages (US-007)", () => {
  test("tokenizers overview concept is published with family explainsIds", () => {
    const overview = getConceptById("concept.tokenizers-overview");
    expect(overview?.status).toBe("published");
    expect(overview?.conceptType).toBe("general");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.tokenizers-overview")).toBe(
      true,
    );
    expect(overview?.explainsIds).toEqual(
      expect.arrayContaining([
        "concept.bpe",
        "concept.wordpiece",
        "concept.unigram-tokenizer",
        "concept.sentencepiece",
        "concept.byte-level-tokenization",
        "concept.vocabulary-size",
        "concept.special-tokens",
        "concept.chat-templates",
        "concept.tokenizer-mismatch",
      ]),
    );
  });

  test("Fumadocs source discovers tokenizer routes without duplicate title chrome", () => {
    expect(source.getPage(["concepts", "tokenizers-overview"])?.url).toBe(
      "/docs/concepts/tokenizers-overview",
    );

    for (const page of ALL_GLOSSARY_PAGES) {
      const discovered = source.getPage(["glossary", page.slug]);
      expect(discovered?.url).toBe(`/docs/glossary/${page.slug}`);
    }
  });

  test("tokenizer overview renders sections and foundation links without draft placeholders", async () => {
    const loaded = await loadConceptPage("tokenizers-overview");
    expect(loaded.frontmatter.kind).toBe("concept");
    expect(loaded.frontmatter.status).toBe("published");
    expect(loaded.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: loaded.messages,
        assets: loaded.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: loaded.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("ConceptMap");
  });

  test("glossary tokenizer pages render sections and overview links", async () => {
    for (const page of ALL_GLOSSARY_PAGES) {
      const loaded = await loadGlossaryPage(page.slug);
      expect(loaded.frontmatter.kind).toBe("glossary");
      expect(loaded.frontmatter.status).toBe("published");
      expect(loaded.frontmatter.registryId).toBe(page.registryId);
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(page.registryId)).toBe(true);

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: loaded.messages,
          assets: loaded.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: loaded.content,
        }),
      );

      expectGlossaryPresentationConvergence(html, {
        title: loaded.messages.title,
      });
      expect(html).toContain("What It Is");
      expect(html).toContain("Why It Matters");
      expect(html).toContain(`href="${page.foundationHref}"`);
      expect(html).not.toContain("Draft placeholder");
      expect(html).not.toContain("ConceptMap");
    }
  });

  test("token and autoregressive-generation link to tokenizer foundations", () => {
    const token = getConceptById("concept.token");
    expect(token?.explainsIds).toContain("concept.tokenizers-overview");

    const autoregressive = getConceptById("concept.autoregressive-generation");
    expect(autoregressive?.relatedIds).toContain("concept.tokenizers-overview");
    expect(autoregressive?.relatedIds).toContain("concept.chat-templates");

    const embedding = getConceptById("concept.embedding");
    expect(embedding?.relatedIds).toContain("concept.tokenizers-overview");

    const transformer = getConceptById("concept.transformer");
    expect(transformer?.relatedIds).toContain("concept.tokenizers-overview");
  });

  test("curated related links resolve tokenizer family pages as live", () => {
    const bpe = getConceptById("concept.bpe");
    if (!bpe) {
      throw new Error("expected concept.bpe");
    }

    const items = deriveCuratedRelatedItems(
      bpe,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const overview = items.find(
      (item) => item.registryId === "concept.tokenizers-overview",
    );
    expect(overview?.href).toBe("/docs/concepts/tokenizers-overview");
    expect(overview?.isPlanned).toBe(false);

    const token = items.find((item) => item.registryId === "concept.token");
    expect(token?.href).toBe("/docs/glossary/token");
    expect(token?.isPlanned).toBe(false);
  });

  test("search index returns canonical tokenizer pages for representative queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const page of ALL_GLOSSARY_PAGES) {
      const document = documents.find(
        (entry) => entry.url === `/docs/glossary/${page.slug}`,
      );
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
      expect(document?.title).toBe(page.searchTitle);
    }

    const overview = documents.find(
      (entry) => entry.url === "/docs/concepts/tokenizers-overview",
    );
    expect(overview?.kind).toBe("concept");
    expect(overview?.title).toBe("Tokenizers overview");

    const bpe = documents.find((entry) => entry.url === "/docs/glossary/bpe");
    const sentencepiece = documents.find(
      (entry) => entry.url === "/docs/glossary/sentencepiece",
    );
    const chatTemplates = documents.find(
      (entry) => entry.url === "/docs/glossary/chat-templates",
    );

    expect(bpe?.title).toBe("BPE");
    expect(sentencepiece?.title).toBe("SentencePiece");
    expect(chatTemplates?.title).toBe("Chat templates");
    expect(bpe?.url).not.toBe(sentencepiece?.url);
  });
});
