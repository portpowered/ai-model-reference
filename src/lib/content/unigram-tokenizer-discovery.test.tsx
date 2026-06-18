import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModuleById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("unigram tokenizer discovery registry", () => {
  test("registry links unigram tokenizer to tokenizer-family neighbors in priority order", () => {
    expect(getModuleById("module.unigram-tokenizer")?.relatedIds).toEqual([
      "concept.token",
      "concept.tokenizers-overview",
      "module.sentencepiece",
      "module.bpe",
    ]);
  });

  test("curated related items keep published token navigable and draft tokenizer neighbors planned", () => {
    const source = getRegistryRecordById("module.unigram-tokenizer");
    if (source?.kind !== "module") {
      throw new Error("expected module.unigram-tokenizer in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({
      registryId: "concept.token",
      href: "/docs/glossary/token",
      isPlanned: false,
    });
    expect(items[1]).toMatchObject({
      registryId: "concept.tokenizers-overview",
      title: "Tokenizers Overview",
      href: undefined,
      isPlanned: true,
    });
    expect(items[2]).toMatchObject({
      registryId: "module.sentencepiece",
      title: "SentencePiece",
      href: undefined,
      isPlanned: true,
    });
    expect(items[3]).toMatchObject({
      registryId: "module.bpe",
      title: "BPE",
      href: undefined,
      isPlanned: true,
    });
  });

  test("RelatedDocs renders the tokenizer-family planned rows without broken links", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.unigram-tokenizer" />,
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain("Tokenizers Overview");
    expect(html).toContain("SentencePiece");
    expect(html).toContain("BPE");
    expect(html.match(/data-planned="true"/g)).toHaveLength(3);
    expect(html).not.toContain('href="/docs/modules/sentencepiece"');
    expect(html).not.toContain('href="/docs/modules/bpe"');
    expect(html).not.toContain('href="/docs/glossary/tokenizers-overview"');
  });
});
