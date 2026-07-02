import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";

const TOKEN_RELATED_EXPLANATIONS = {
  "module.byte-level-tokenization":
    "Byte-level tokenization shows why tokenizer output does not have to line up with whole words.",
  "concept.special-tokens":
    "Special tokens show which reserved markers the tokenizer keeps aside for boundaries, padding, and control signals.",
  "concept.tokenizers-overview":
    "Use the broader tokenizer-family page when you want the preprocessing step, nearby algorithms, and context-cost tradeoffs rather than just the definition of one token.",
  "concept.embedding":
    "Each token ID becomes a learned numerical representation before the model mixes context.",
  "concept.vocabulary-size":
    "That vocabulary count tells you how many ordinary and reserved tokens the tokenizer can emit IDs for.",
  "concept.logit":
    "Next-token prediction starts as a candidate score for each vocabulary token.",
  "concept.softmax":
    "Those candidate scores convert into probabilities across the vocabulary.",
} as const;

describe("Phase 2 token-probability path related docs (phase-2-token-probability-path-convergence-005)", () => {
  test("token messages define layperson relationship explanations for the probability path", async () => {
    const page = await loadGlossaryPage("token");

    for (const [registryId, reason] of Object.entries(
      TOKEN_RELATED_EXPLANATIONS,
    )) {
      expect(page.messages.relatedDocs?.[registryId]?.reason).toBe(reason);
    }
  });

  test("applyRelatedDocMessageOverrides surfaces token path explanations on curated items", () => {
    const source = getRegistryRecordById("concept.token");
    if (!source) {
      throw new Error("expected concept.token in registry runtime");
    }

    const items = applyRelatedDocMessageOverrides(
      deriveCuratedRelatedItems(
        source,
        listRelatedRegistryRecords(),
        getPublishedDocsRegistryIds(),
      ),
      {
        relatedDocs: Object.fromEntries(
          Object.entries(TOKEN_RELATED_EXPLANATIONS).map(
            ([registryId, reason]) => [registryId, { reason }],
          ),
        ),
      },
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "module.byte-level-tokenization",
      "concept.special-tokens",
      "concept.tokenizers-overview",
      "concept.embedding",
      "concept.vocabulary-size",
      "concept.logit",
      "concept.softmax",
    ]);
    expect(items[0]?.reasonLabel).toBe(
      TOKEN_RELATED_EXPLANATIONS["module.byte-level-tokenization"],
    );
    expect(items[1]?.reasonLabel).toBe(
      TOKEN_RELATED_EXPLANATIONS["concept.special-tokens"],
    );
    expect(items[2]?.reasonLabel).toBe(
      TOKEN_RELATED_EXPLANATIONS["concept.tokenizers-overview"],
    );
    expect(items[3]?.reasonLabel).toBe(
      TOKEN_RELATED_EXPLANATIONS["concept.embedding"],
    );
    expect(items[4]?.reasonLabel).toBe(
      TOKEN_RELATED_EXPLANATIONS["concept.vocabulary-size"],
    );
    expect(items[5]?.reasonLabel).toBe(
      TOKEN_RELATED_EXPLANATIONS["concept.logit"],
    );
    expect(items[6]?.reasonLabel).toBe(
      TOKEN_RELATED_EXPLANATIONS["concept.softmax"],
    );
  });

  test("token page related section renders relationship explanations with published links", async () => {
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
    expect(html).toContain(
      TOKEN_RELATED_EXPLANATIONS["module.byte-level-tokenization"],
    );
    expect(html).toContain(
      TOKEN_RELATED_EXPLANATIONS["concept.special-tokens"],
    );
    expect(html).toContain(
      TOKEN_RELATED_EXPLANATIONS["concept.tokenizers-overview"],
    );
    expect(html).toContain(TOKEN_RELATED_EXPLANATIONS["concept.embedding"]);
    expect(html).toContain(
      TOKEN_RELATED_EXPLANATIONS["concept.vocabulary-size"],
    );
    expect(html).toContain(TOKEN_RELATED_EXPLANATIONS["concept.logit"]);
    expect(html).toContain(TOKEN_RELATED_EXPLANATIONS["concept.softmax"]);
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/concepts/embedding"');
    expect(html).toContain('href="/docs/glossary/vocabulary-size"');
    expect(html).toContain('href="/docs/glossary/logit"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain("Show 2 more");
  });

  test("token related links remain keyboard-focusable docs chrome anchors", async () => {
    const page = await loadGlossaryPage("token");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    for (const href of [
      "/docs/modules/byte-level-tokenization",
      "/docs/glossary/special-tokens",
      "/docs/concepts/tokenizers-overview",
      "/docs/concepts/embedding",
      "/docs/glossary/vocabulary-size",
      "/docs/glossary/logit",
      "/docs/glossary/softmax",
    ]) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain("focus-visible:ring-2");
    }
  });
});
