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
      title: "Tokenizer overview",
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
    expect(html).toContain("Tokenizer overview");
    expect(html).toContain("SentencePiece");
    expect(html).toContain("BPE");
    expect(html.match(/data-planned="true"/g)).toHaveLength(3);
    expect(html).not.toContain('href="/docs/modules/sentencepiece"');
    expect(html).not.toContain('href="/docs/modules/bpe"');
    expect(html).not.toContain('href="/docs/glossary/tokenizers-overview"');
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
    "unigram tokenizer",
    "SentencePiece unigram",
    "merge-based tokenizer",
  ] as const)("search query %s returns unigram tokenizer through the normal discovery path", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(UNIGRAM_TOKENIZER_URL);
  });
});
