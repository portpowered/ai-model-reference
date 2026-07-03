import { describe, expect, test } from "bun:test";
import { PROSE_AUTO_LINK_PHRASES } from "@/lib/content/prose-auto-link-runtime";
import {
  getPublishedDocsEntriesBySlug,
  getPublishedDocsEntryByRegistryId,
  getPublishedDocsHrefForRecord,
  listPublishedDocsEntries,
  MODULE_BACKED_CONCEPT_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import {
  hasPublishedDocsPageForRecord,
  registryRecordHref,
} from "@/lib/content/registry-linking";
import {
  getConceptById,
  getModelById,
  getModuleById,
  getPaperById,
  getSystemById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

function resolvePhraseHref(phrase: string): string | undefined {
  const normalized = phrase.toLowerCase();
  return PROSE_AUTO_LINK_PHRASES.find(
    (entry) => entry.phrase.toLowerCase() === normalized,
  )?.href;
}

function requireRecord<T>(record: T | undefined, label: string): T {
  if (!record) {
    throw new Error(`expected ${label} record in registry`);
  }

  return record;
}

describe("published docs routing contract", () => {
  test("derived lookup surface covers representative published record kinds", () => {
    const cases = [
      {
        label: "module",
        record: requireRecord(
          getModuleById("module.grouped-query-attention"),
          "grouped-query-attention module",
        ),
        href: "/docs/modules/grouped-query-attention",
      },
      {
        label: "concept section concept",
        record: requireRecord(
          getConceptById("concept.quantization"),
          "quantization concept",
        ),
        href: "/docs/concepts/quantization",
      },
      {
        label: "glossary concept",
        record: requireRecord(getConceptById("concept.token"), "token concept"),
        href: "/docs/glossary/token",
      },
      {
        label: "model",
        record: requireRecord(getModelById("model.gpt-3"), "gpt-3 model"),
        href: "/docs/models/gpt-3",
      },
      {
        label: "paper",
        record: requireRecord(
          getPaperById("paper.deepseek-v4"),
          "deepseek-v4 paper",
        ),
        href: "/docs/papers/deepseek-v4",
      },
      {
        label: "training regime",
        record: requireRecord(
          getTrainingRegimeById("training-regime.on-policy-distillation"),
          "on-policy-distillation training regime",
        ),
        href: "/docs/training/on-policy-distillation",
      },
      {
        label: "dpo training regime",
        record: requireRecord(
          getTrainingRegimeById("training-regime.dpo"),
          "dpo training regime",
        ),
        href: "/docs/training/dpo",
      },
      {
        label: "system",
        record: requireRecord(
          getSystemById("system.deployment"),
          "deployment system",
        ),
        href: "/docs/systems/deployment",
      },
      {
        label: "system with typed subgroup",
        record: requireRecord(
          getSystemById("system.on-disk-kv-cache"),
          "on-disk-kv-cache system",
        ),
        href: "/docs/systems/on-disk-kv-cache",
      },
    ] as const;
    const listedEntriesByRegistryId = new Map(
      listPublishedDocsEntries().map((entry) => [entry.registryId, entry]),
    );

    for (const { label, record, href } of cases) {
      const entryByRegistryId = getPublishedDocsEntryByRegistryId(record.id);
      const entriesBySlug = getPublishedDocsEntriesBySlug(record.slug);

      expect(listedEntriesByRegistryId.get(record.id), label).toEqual(
        entryByRegistryId,
      );
      expect(entryByRegistryId?.registryId, label).toBe(record.id);
      expect(entryByRegistryId?.slug, label).toBe(record.slug);
      expect(
        entriesBySlug.some((entry) => entry.registryId === record.id),
        label,
      ).toBe(true);
      expect(getPublishedDocsHrefForRecord(record), label).toBe(href);
      expect(registryRecordHref(record), label).toBe(href);
      expect(
        hasPublishedDocsPageForRecord(record, PUBLISHED_DOCS_REGISTRY_IDS),
        label,
      ).toBe(true);
    }
  });

  test("presence, related-doc hrefs, and prose auto-links stay aligned for representative concept routes", () => {
    const relu = requireRecord(
      getConceptById("concept.relu"),
      "relu concept",
    );
    const quantization = requireRecord(
      getConceptById("concept.quantization"),
      "quantization concept",
    );
    const token = requireRecord(
      getConceptById("concept.token"),
      "token concept",
    );

    const representativeConcepts = [
      {
        alias: "rectified linear unit",
        href: "/docs/modules/relu",
        record: relu,
      },
      {
        alias: "low-bit inference",
        href: "/docs/concepts/quantization",
        record: quantization,
      },
      {
        alias: "token",
        href: "/docs/glossary/token",
        record: token,
      },
    ] as const;

    const source = {
      ...requireRecord(getModelById("model.gpt-3"), "gpt-3 model"),
      relatedIds: representativeConcepts.map(({ record }) => record.id),
    };
    const relatedItems = deriveCuratedRelatedItems(
      source,
      representativeConcepts.map(({ record }) => record),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    const relatedHrefsById = new Map(
      relatedItems.map((item) => [item.registryId, item.href]),
    );

    for (const { alias, href, record } of representativeConcepts) {
      expect(
        hasPublishedDocsPageForRecord(record, PUBLISHED_DOCS_REGISTRY_IDS),
        record.id,
      ).toBe(true);
      expect(getPublishedDocsHrefForRecord(record), record.id).toBe(href);
      expect(registryRecordHref(record), record.id).toBe(href);
      expect(relatedHrefsById.get(record.id), record.id).toBe(href);
      expect(resolvePhraseHref(alias), alias).toBe(href);
    }
  });

  test("module-backed concepts keep stable membership and href behavior for runtime callers", () => {
    const relu = requireRecord(getConceptById("concept.relu"), "relu concept");
    const publishedModuleEntry = requireRecord(
      getPublishedDocsEntryByRegistryId("module.relu"),
      "relu module entry",
    );
    const source = {
      ...requireRecord(getModelById("model.gpt-3"), "gpt-3 model"),
      relatedIds: [relu.id],
    };
    const [relatedItem] = deriveCuratedRelatedItems(
      source,
      [relu],
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(getPublishedDocsEntryByRegistryId(relu.id)).toBe(undefined);
    expect(getPublishedDocsEntriesBySlug(relu.slug)).toEqual([
      publishedModuleEntry,
    ]);
    expect(MODULE_BACKED_CONCEPT_REGISTRY_IDS.has(relu.id)).toBe(true);
    expect(
      hasPublishedDocsPageForRecord(relu, PUBLISHED_DOCS_REGISTRY_IDS),
    ).toBe(true);
    expect(getPublishedDocsHrefForRecord(relu)).toBe("/docs/modules/relu");
    expect(registryRecordHref(relu)).toBe("/docs/modules/relu");
    expect(relatedItem).toEqual(
      expect.objectContaining({
        registryId: relu.id,
        href: "/docs/modules/relu",
        isPlanned: false,
      }),
    );
  });
});
