import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  getModelById,
  getPaperById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("decoder discovery registry alignment", () => {
  test("concept.decoder keeps canonical broad-concept aliases and discovery neighbors", () => {
    const record = getConceptById("concept.decoder");

    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "Decoder",
        "decoder block",
        "decoder stack",
        "decoder-only stack",
      ]),
    );
    expect(record?.tags).toEqual(["foundations", "taxonomy"]);
    expect(record?.relatedIds).toEqual([
      "concept.encoder",
      "concept.encoder-decoder",
      "concept.autoregressive-generation",
      "concept.decode",
      "concept.transformer",
      "module.causal-attention",
      "model.gpt-3",
      "paper.gpt-2-report",
    ]);
  });

  test("decoder curated related links resolve to the nearby published docs surfaces for this slice", () => {
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
      items.some(
        (item) =>
          item.registryId === "concept.encoder-decoder" &&
          item.href === "/docs/glossary/encoder-decoder",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.autoregressive-generation" &&
          item.href === "/docs/glossary/autoregressive-generation",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.decode" &&
          item.href === "/docs/glossary/decode",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.transformer" &&
          item.href === "/docs/glossary/transformer",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "module.causal-attention" &&
          item.href === "/docs/modules/causal-attention",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "model.gpt-3" &&
          item.href === "/docs/models/gpt-3",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "paper.gpt-2-report" &&
          item.href === "/docs/papers/gpt-2-report",
      ),
    ).toBe(true);
  });

  test("gpt-3 and the GPT-2 report expose the canonical decoder concept as a published related destination", () => {
    const gpt3 = getModelById("model.gpt-3");
    const gpt2Report = getPaperById("paper.gpt-2-report");

    expect(gpt3?.relatedIds).toContain("concept.decoder");
    expect(gpt2Report?.relatedIds).toContain("concept.decoder");

    const gpt3Html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.gpt-3"
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );
    expect(gpt3Html).toContain('href="/docs/concepts/decoder"');

    const gpt2Html = renderToStaticMarkup(
      <RelatedDocs registryId="paper.gpt-2-report" />,
    );
    expect(gpt2Html).toContain('href="/docs/concepts/decoder"');
  });
});
