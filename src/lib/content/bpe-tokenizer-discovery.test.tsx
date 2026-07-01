import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModuleById,
  getRegistryRecordById,
  listClassificationMembers,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { resolveModulesSidebarGroupWithSource } from "@/lib/content/sidebar-grouping";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";

const BPE_URL = "/docs/modules/bpe";
const TOKENIZATION_TAG_SLUG = "tokenization";
const TOKENIZER_CLASSIFICATION_ID = "classification.module.tokenization";
const POSITIONAL_CLASSIFICATION_ID =
  "classification.module.positional-encoding";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("BPE tokenizer-family discovery surfaces (tokenizers-002)", () => {
  test("registry classifies BPE under the tokenizer module family", () => {
    const record = getModuleById("module.bpe");
    expect(record?.status).toBe("published");
    expect(record?.primaryClassificationId).toBe(TOKENIZER_CLASSIFICATION_ID);
    expect(record?.moduleType).toBe("tokenizer");
    expect(record?.moduleFamily).toBe("tokenization");

    const tokenizerMembers = listClassificationMembers(
      TOKENIZER_CLASSIFICATION_ID,
    ).map((member) => member.record.id);
    const positionalMembers = listClassificationMembers(
      POSITIONAL_CLASSIFICATION_ID,
    ).map((member) => member.record.id);

    expect(tokenizerMembers).toContain("module.bpe");
    expect(positionalMembers).not.toContain("module.bpe");
  });

  test("sidebar grouping and metadata surfaces present BPE as a tokenizer module", () => {
    const record = getModuleById("module.bpe");
    if (!record) {
      throw new Error("expected module.bpe in registry runtime");
    }

    expect(resolveModulesSidebarGroupWithSource(record)).toEqual({
      groupId: "tokenizers",
      source: "derived-taxonomy",
    });

    const metadataHtml = renderToStaticMarkup(
      <ModuleMetadataCard registryId="module.bpe" />,
    );
    expect(metadataHtml).toContain("Classification");
    expect(metadataHtml).toContain("Tokenization Methods");
    expect(metadataHtml).not.toContain("Position Encoding Methods");
    expect(metadataHtml).not.toContain("Positional Embeddings");
    expect(metadataHtml).not.toContain("Also classified as");
  });

  test("curated related docs connect BPE to the tokenizer overview and nearby tokenizer modules", () => {
    const source = getRegistryRecordById("module.bpe");
    if (source?.kind !== "module") {
      throw new Error("expected module.bpe in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.token",
      "concept.special-tokens",
      "concept.tokenizers-overview",
      "module.wordpiece",
      "module.sentencepiece",
      "model.gpt-3",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      "/docs/glossary/special-tokens",
      "/docs/concepts/tokenizers-overview",
      "/docs/modules/wordpiece",
      "/docs/modules/sentencepiece",
      "/docs/models/gpt-3",
    ]);

    const relatedHtml = renderToStaticMarkup(
      <RelatedDocs registryId="module.bpe" />,
    );
    expect(relatedHtml).toContain('data-testid="curated-related-docs"');
    expect(relatedHtml).toContain(
      'data-testid="classification-siblings-related-docs"',
    );
    expect(relatedHtml).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(relatedHtml).toContain("Tokenizer overview");
    expect(relatedHtml).toContain('href="/docs/modules/wordpiece"');
    expect(relatedHtml).toContain('href="/docs/modules/sentencepiece"');
    expect(relatedHtml).toContain("Same classification: tokenization methods");
    expect(relatedHtml).not.toContain("Same classification: position");
  });

  test("tokenization tag landing surfaces BPE as a tokenizer-family module entry point", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      TOKENIZATION_TAG_SLUG,
      messages,
      "en",
    );
    const moduleGroup = groups.find((group) => group.kind === "module");
    const conceptGroup = groups.find((group) => group.kind === "concept");

    expect(moduleGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "module",
          slug: "bpe",
          title: "Byte Pair Encoding",
          url: BPE_URL,
        }),
      ]),
    );
    expect(conceptGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "concept",
          slug: "tokenizers-overview",
          url: "/docs/concepts/tokenizers-overview",
        }),
      ]),
    );

    const page = await TagLandingPage({
      params: Promise.resolve({ slug: TOKENIZATION_TAG_SLUG }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Byte Pair Encoding");
    expect(html).toContain(`href="${BPE_URL}"`);
    expect(html).toContain("Tokenizers overview");
    expect(html).toContain('href="/search?tag=tokenization"');
    expect(html).not.toContain("No resources");
    expect(html).not.toContain("Nothing has shipped");
  });

  test.each([
    ["BPE", true],
    ["byte pair encoding", true],
    ["tokenizer", false],
  ] as const)("search query %s surfaces the canonical BPE page", async (query, expectsTopHit) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    if (expectsTopHit) {
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(BPE_URL);
      return;
    }

    expect(
      results.some((result) => pageBaseUrl(result.url ?? "") === BPE_URL),
    ).toBe(true);
  });
});
