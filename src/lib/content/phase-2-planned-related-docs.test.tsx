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

const DRAFT_FORWARD_TARGET_IDS = [
  "concept.transformer",
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

describe("Phase 2 planned related docs (US-002)", () => {
  test("draft forward-target concepts are registered in runtime", () => {
    for (const id of DRAFT_FORWARD_TARGET_IDS) {
      const record = getConceptById(id);
      expect(record?.status).toBe("draft");
    }
  });

  test("draft forward targets render as planned curated rows without href", () => {
    const source = getRegistryRecordById("concept.token");
    if (!source) {
      throw new Error("expected concept.token in registry runtime");
    }
    const withRelated = {
      ...source,
      relatedIds: [...DRAFT_FORWARD_TARGET_IDS],
    };
    const items = deriveCuratedRelatedItems(
      withRelated,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(items).toHaveLength(4);
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

  test("RelatedDocs renders planned rows without anchor hrefs for draft-only forwards", () => {
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
    expect(items.every((item) => !item.href)).toBe(true);
    expect(items.every((item) => item.isPlanned)).toBe(true);
  });

  test("DerivedRelatedDocs renders draft same-concept-type peer as planned", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={["same-concept-type"]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="same-concept-type"');
    expect(html).toContain('data-planned="true"');
    expect(html).toContain("Transformer");
    expect(html).toContain(PLANNED_RELATED_REASON_LABEL);
    expect(html).not.toContain('href="/docs/glossary/transformer"');
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
