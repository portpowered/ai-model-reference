import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  CURATED_RELATED,
  DERIVED_RELATED_DOC_GROUP_LABELS,
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";

describe("Phase 2 token-to-probability chain curated related docs (US-002)", () => {
  test("token registry curated related resolves special tokens plus the published probability-chain forward steps", () => {
    const source = getRegistryRecordById("concept.token");
    if (!source) {
      throw new Error("expected concept.token in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    expect(items).toHaveLength(6);
    expect(items.map((item) => item.registryId)).toEqual([
      "module.byte-level-tokenization",
      "concept.special-tokens",
      "concept.embedding",
      "concept.vocabulary-size",
      "concept.logit",
      "concept.softmax",
    ]);
    expect(items[0]?.registryId).toBe("module.byte-level-tokenization");
    expect(items[0]?.slug).toBe("byte-level-tokenization");
    expect(items[0]?.title).toBe("byte-level tokenization");
    expect(items[0]?.isPlanned).toBe(false);
    expect(items[0]?.href).toBe("/docs/modules/byte-level-tokenization");
    expect(items[0]?.reasonLabel).toBe(
      DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED],
    );
    expect(items[1]?.registryId).toBe("concept.special-tokens");
    expect(items[1]?.slug).toBe("special-tokens");
    expect(items[1]?.title).toBe("special token");
    expect(items[1]?.isPlanned).toBe(false);
    expect(items[1]?.href).toBe("/docs/glossary/special-tokens");
    expect(items[1]?.reasonLabel).toBe(
      DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED],
    );
    expect(items[2]?.registryId).toBe("concept.embedding");
    expect(items[2]?.href).toBe("/docs/glossary/embedding");
  });

  test("DerivedRelatedDocs renders curated-related group with reason labels for token", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={[CURATED_RELATED]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="curated-related"');
    expect(html).toContain("special token");
    expect(html).toContain("embeddings");
    expect(html).toContain("vocabulary size");
    expect(html).toContain("logits");
    expect(html).toContain("softmax function");
    expect(html).toContain("byte-level tokenization");
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/glossary/vocabulary-size"');
    expect(html).toContain('href="/docs/glossary/logit"');
    expect(html).toContain('href="/docs/glossary/softmax"');
  });

  test("token glossary page related section surfaces special tokens and embedding from registry relatedIds", async () => {
    const page = await loadGlossaryPage("token");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain("special token");
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain("embeddings");
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/glossary/vocabulary-size"');
    expect(html).toContain('href="/docs/glossary/logit"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain(
      "Each token ID becomes a learned numerical representation before the model mixes context.",
    );
    expect(html).toContain(
      "That vocabulary count tells you how many ordinary and reserved tokens the tokenizer can emit IDs for.",
    );
    expect(html).toContain(
      "Next-token prediction starts as a candidate score for each vocabulary token.",
    );
    expect(html).toContain(
      "Those candidate scores convert into probabilities across the vocabulary.",
    );
  });

  test("published glossary curated links use /docs/glossary/<slug> hrefs", async () => {
    const page = await loadGlossaryPage("model");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });
});
