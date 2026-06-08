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
import {
  deriveCuratedRelatedItems,
  PLANNED_RELATED_REASON_LABEL,
} from "@/lib/content/related-docs";

const REMAINING_DRAFT_FORWARD_TARGET_IDS = ["concept.world-model"] as const;

describe("Phase 2 planned related docs (US-002)", () => {
  test("forward-target concepts are registered with transformer, diffusion-model, and multimodal-model published and others draft", () => {
    expect(getConceptById("concept.transformer")?.status).toBe("published");
    expect(getConceptById("concept.diffusion-model")?.status).toBe("published");
    expect(getConceptById("concept.multimodal-model")?.status).toBe(
      "published",
    );
    for (const id of REMAINING_DRAFT_FORWARD_TARGET_IDS) {
      const record = getConceptById(id);
      expect(record?.status).toBe("draft");
    }
  });

  test("remaining draft forward targets render as planned curated rows without href", () => {
    const source = getRegistryRecordById("concept.token");
    if (!source) {
      throw new Error("expected concept.token in registry runtime");
    }
    const withRelated = {
      ...source,
      relatedIds: [...REMAINING_DRAFT_FORWARD_TARGET_IDS],
    };
    const items = deriveCuratedRelatedItems(
      withRelated,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(items).toHaveLength(1);
    for (const item of items) {
      expect(item.isPlanned).toBe(true);
      expect(item.href).toBeUndefined();
      expect(item.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);
    }
  });

  test("RelatedDocs renders published token forward link to embedding", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="concept.token" />,
    );
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("embeddings");
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).not.toContain(PLANNED_RELATED_REASON_LABEL);
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
