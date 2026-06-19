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

    expect(items.map((item) => item.reasonLabel)).toEqual([
      TOKEN_RELATED_EXPLANATIONS["module.byte-level-tokenization"],
      TOKEN_RELATED_EXPLANATIONS["concept.embedding"],
      TOKEN_RELATED_EXPLANATIONS["concept.vocabulary-size"],
      TOKEN_RELATED_EXPLANATIONS["concept.logit"],
      TOKEN_RELATED_EXPLANATIONS["concept.softmax"],
    ]);
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
    expect(html).toContain(TOKEN_RELATED_EXPLANATIONS["concept.embedding"]);
    expect(html).toContain(
      TOKEN_RELATED_EXPLANATIONS["concept.vocabulary-size"],
    );
    expect(html).toContain(TOKEN_RELATED_EXPLANATIONS["concept.logit"]);
    expect(html).toContain(TOKEN_RELATED_EXPLANATIONS["concept.softmax"]);
    expect(html).toContain(
      TOKEN_RELATED_EXPLANATIONS["module.byte-level-tokenization"],
    );
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/glossary/vocabulary-size"');
    expect(html).toContain('href="/docs/glossary/logit"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).not.toContain(">curated<");
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
      "/docs/glossary/embedding",
      "/docs/glossary/vocabulary-size",
      "/docs/glossary/logit",
      "/docs/glossary/softmax",
    ]) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain("focus-visible:ring-2");
    }
  });
});
