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
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";

const UNIGRAM_TOKENIZER_URL = "/docs/modules/unigram-tokenizer";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("unigram tokenizer discovery registry", () => {
  test("registry links unigram tokenizer to tokenizer-family neighbors in priority order", () => {
    expect(getModuleById("module.unigram-tokenizer")?.relatedIds).toEqual([
      "concept.token",
      "concept.tokenizers-overview",
      "module.sentencepiece",
      "module.bpe",
    ]);
  });

  test("curated related items preserve configured tokenizer-family order before duplicate shipped peers are regrouped", () => {
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
      title: "Tokenizer overview",
      href: "/docs/concepts/tokenizers-overview",
      isPlanned: false,
    });
    expect(items[2]).toMatchObject({
      registryId: "module.sentencepiece",
      title: "SentencePiece",
      href: "/docs/modules/sentencepiece",
      isPlanned: false,
    });
    expect(items[3]).toMatchObject({
      registryId: "module.bpe",
      title: "BPE",
      href: "/docs/modules/bpe",
      isPlanned: false,
    });
  });

  test("RelatedDocs renders shipped tokenizer peers plus the published overview row", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.unigram-tokenizer" />,
    );

    expect(html).toContain('data-testid="variant-group-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain("Tokenizer overview");
    expect(html).toContain("SentencePiece");
    expect(html).toContain("BPE");
    expect(html).toContain("WordPiece");
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).not.toContain('data-planned="true"');
    expect(html).toContain('href="/docs/modules/sentencepiece"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
  });

  test("token-to-probability-chain tag landing surfaces unigram tokenizer as a module entry point", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      "token-to-probability-chain",
      messages,
      "en",
    );
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(moduleGroup?.kindLabel).toBe("Module");
    expect(
      moduleGroup?.resources.some(
        (resource) => resource.url === UNIGRAM_TOKENIZER_URL,
      ),
    ).toBe(true);
  });

  test.each([
    ["unigram tokenizer", true],
    ["SentencePiece unigram", true],
    ["merge-based tokenizer", false],
  ] as const)(
    "search query %s returns unigram tokenizer through the normal discovery path",
    async (query, expectsTopHit) => {
      const results = await docsSearchApi.search(query);

      expect(results.length).toBeGreaterThan(0);
      if (expectsTopHit) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(UNIGRAM_TOKENIZER_URL);
        return;
      }

      expect(
        results.some(
          (result) => pageBaseUrl(result.url ?? "") === UNIGRAM_TOKENIZER_URL,
        ),
      ).toBe(true);
    },
  );
});
