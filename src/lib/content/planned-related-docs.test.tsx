import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

const FORWARD_TARGET_IDS = [
  "concept.transformer",
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

describe("Phase 2 planned related docs (US-002)", () => {
  test("all four forward-target model families are published", () => {
    for (const id of FORWARD_TARGET_IDS) {
      expect(getConceptById(id)?.status).toBe("published");
    }
  });

  test("published forward targets render curated rows with href", () => {
    const source = getRegistryRecordById("concept.token");
    if (!source) {
      throw new Error("expected concept.token in registry runtime");
    }
    const withRelated = {
      ...source,
      relatedIds: [...FORWARD_TARGET_IDS],
    };
    const items = deriveCuratedRelatedItems(
      withRelated,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.isPlanned).toBe(false);
      expect(item.href).toBeDefined();
    }
  });

  test("RelatedDocs renders published token forward link to embedding", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="concept.token" />,
    );
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("embeddings");
    expect(html).toContain('href="/docs/glossary/embedding"');
  });

  test("RelatedDocs renders GQA curated links to attention overview and sibling variants", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.grouped-query-attention" />,
    );
    expect(html).toContain('data-related-group="same-variant-group"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/multi-head-latent-attention"');
    expect(html).toContain("Same variant group");
    expect(html).toContain("curated");
  });

  test("RelatedDocs renders published transformer and diffusion-model forwards", () => {
    const source = getConceptById("concept.token");
    if (!source) {
      throw new Error("expected concept.token in registry runtime");
    }
    const tokenWithForwards = {
      ...source,
      relatedIds: ["concept.transformer", "concept.diffusion-model"],
    };
    const candidates = listRelatedRegistryRecords().map((record) =>
      record.id === "concept.token" ? tokenWithForwards : record,
    );
    const items = deriveCuratedRelatedItems(
      tokenWithForwards,
      candidates,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.registryId).toBe("concept.transformer");
    expect(items[0]?.href).toBe("/docs/glossary/transformer");
    expect(items[0]?.isPlanned).toBe(false);
    expect(items[1]?.registryId).toBe("concept.diffusion-model");
    expect(items[1]?.href).toBe("/docs/glossary/diffusion-model");
    expect(items[1]?.isPlanned).toBe(false);
  });

  test("DerivedRelatedDocs renders published transformer same-concept-type peer with href", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={["same-concept-type"]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="same-concept-type"');
    expect(html).toContain("Transformers");
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain("Same concept type");
  });

  test("DerivedRelatedDocs still renders navigable links for published module peers", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={["shared-tags"]}
      />,
    );

    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Shared tag");
  });
});
