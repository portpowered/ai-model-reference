import { describe, expect, test } from "bun:test";
import type { RegistryIndexes } from "@/lib/content/registry";
import type {
  ClassificationRecord,
  ConceptRecord,
  ModelRecord,
  ModuleRecord,
} from "@/lib/content/schemas";
import { buildBaseSearchDocument } from "./build-base-document";
import { enrichSearchDocument } from "./enrich-search-document";
import { toOramaRecord } from "./orama-index";
import { toStructuredData } from "./to-structured-data";
import { topologySearchText } from "./topology-search-terms";
import type { BaseSearchDocument } from "./types";
import { EMPTY_SEARCH_DOCUMENT_TOPOLOGY } from "./types";

function buildRegistryIndexes(
  records: Array<
    ModuleRecord | ModelRecord | ConceptRecord | ClassificationRecord
  >,
): RegistryIndexes {
  const classifications = records.filter(
    (record): record is ClassificationRecord =>
      record.kind === "classification",
  );

  return {
    byId: new Map(records.map((record) => [record.id, record])),
    bySlug: new Map(records.map((record) => [record.slug, record])),
    classificationsById: new Map(
      classifications.map((record) => [record.id, record]),
    ),
    tagsById: new Map(),
    tagsBySlug: new Map(),
  };
}

function buildSyntheticBase(
  overrides: Partial<BaseSearchDocument> = {},
): BaseSearchDocument {
  return {
    id: "/docs/modules/synthetic-module",
    registryId: "module.synthetic-module",
    url: "/docs/modules/synthetic-module",
    kind: "module",
    title: "Synthetic Module",
    description: "Synthetic module description",
    bodyText: "Synthetic body text",
    headings: ["Overview"],
    directAliases: ["synthetic"],
    aliases: ["synthetic"],
    tags: ["attention"],
    relatedIds: [],
    facets: { kind: "module", tags: ["attention"] },
    topology: { ...EMPTY_SEARCH_DOCUMENT_TOPOLOGY },
    ...overrides,
  };
}

function buildClassification(
  overrides: Partial<ClassificationRecord> = {},
): ClassificationRecord {
  return {
    id: "classification.module.attention",
    slug: "attention-mechanisms",
    kind: "classification",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: ["attention"],
    tags: ["attention"],
    relatedIds: [],
    citationIds: [],
    status: "published",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    classificationType: "family",
    classifiesKinds: ["module"],
    parentClassificationId: "classification.module",
    ...overrides,
  };
}

function buildModule(overrides: Partial<ModuleRecord> = {}): ModuleRecord {
  return {
    id: "module.synthetic-module",
    slug: "synthetic-module",
    kind: "module",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: [],
    tags: [],
    relatedIds: [],
    citationIds: [],
    status: "published",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    moduleType: "other",
    optimizes: ["kv-cache"],
    exampleModelIds: [],
    improvesOnIds: [],
    tradeoffIds: [],
    usedByModelIds: [],
    introducedByPaperIds: [],
    mathLevel: "none",
    primaryClassificationId: "classification.module.attention.grouped-query",
    relationships: [
      {
        relationshipType: "uses",
        targetId: "concept.activation",
      },
    ],
    ...overrides,
  };
}

function buildModel(overrides: Partial<ModelRecord> = {}): ModelRecord {
  return {
    id: "model.synthetic-model",
    slug: "synthetic-model",
    kind: "model",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: [],
    tags: [],
    relatedIds: [],
    citationIds: [],
    status: "published",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    family: "gpt",
    sourceType: "closed",
    modalities: ["text"],
    trainingRegimeIds: ["training-regime.pretraining"],
    architectureIds: [],
    moduleIds: [],
    datasetIds: [],
    paperIds: [],
    ...overrides,
  };
}

describe("enrichSearchDocument", () => {
  test("resolves published classification lineage, ancestors, roots, relationships, and related topology ids", () => {
    const moduleRoot = buildClassification({
      id: "classification.module",
      slug: "module",
      parentClassificationId: undefined,
    });
    const attentionFamily = buildClassification({
      id: "classification.module.attention",
      slug: "attention-mechanisms",
      parentClassificationId: moduleRoot.id,
    });
    const groupedQuery = buildClassification({
      id: "classification.module.attention.grouped-query",
      slug: "attention-grouped-query",
      parentClassificationId: attentionFamily.id,
      aliases: ["grouped-query attention", "GQA"],
    });
    const activationConcept: ConceptRecord = {
      id: "concept.activation",
      slug: "activation",
      kind: "concept",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: ["activation function"],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      conceptType: "architecture",
      prerequisiteIds: [],
      explainsIds: [],
    };
    const moduleRecord = buildModule();
    const indexes = buildRegistryIndexes([
      moduleRoot,
      attentionFamily,
      groupedQuery,
      activationConcept,
      moduleRecord,
    ]);

    const enriched = enrichSearchDocument(buildSyntheticBase(), indexes);

    expect(enriched.topology.primaryClassificationId).toBe(groupedQuery.id);
    expect(enriched.topology.ancestorClassificationIds).toEqual([
      attentionFamily.id,
      moduleRoot.id,
    ]);
    expect(enriched.topology.rootClassificationIds).toEqual([moduleRoot.id]);
    expect(enriched.topology.relationships).toEqual([
      expect.objectContaining({
        relationshipType: "uses",
        targetId: activationConcept.id,
        targetKind: "concept",
        targetSlug: activationConcept.slug,
      }),
    ]);
    expect(enriched.topology.relatedTopologyIds).toEqual(
      expect.arrayContaining([
        groupedQuery.id,
        attentionFamily.id,
        moduleRoot.id,
        activationConcept.id,
      ]),
    );
    expect(enriched.topology.terms).toEqual(
      expect.arrayContaining([
        groupedQuery.id,
        "attention-grouped-query",
        attentionFamily.id,
        moduleRoot.id,
        "uses",
        activationConcept.id,
        activationConcept.slug,
      ]),
    );
  });

  test("adds classification, relationship, and legacy taxonomy facets without AI-only model or module fields", () => {
    const moduleRoot = buildClassification({
      id: "classification.module",
      slug: "module",
      parentClassificationId: undefined,
    });
    const attentionFamily = buildClassification({
      id: "classification.module.attention",
      slug: "attention-mechanisms",
      parentClassificationId: moduleRoot.id,
    });
    const groupedQuery = buildClassification({
      id: "classification.module.attention.grouped-query",
      slug: "attention-grouped-query",
      parentClassificationId: attentionFamily.id,
    });
    const moduleRecord = buildModule({
      moduleFamily: "attention",
      conceptType: "attention-variant",
      variantGroup: "attention-head-sharing",
    });
    const indexes = buildRegistryIndexes([
      moduleRoot,
      attentionFamily,
      groupedQuery,
      moduleRecord,
    ]);

    const enriched = enrichSearchDocument(buildSyntheticBase(), indexes);

    expect(enriched.facets.primaryClassificationId).toBe(groupedQuery.id);
    expect(enriched.facets.primaryClassificationSlug).toBe(groupedQuery.slug);
    expect(enriched.facets.classificationIds).toEqual(
      expect.arrayContaining([groupedQuery.id]),
    );
    expect(enriched.facets.ancestorClassificationIds).toEqual([
      attentionFamily.id,
      moduleRoot.id,
    ]);
    expect(enriched.facets.rootClassificationSlugs).toEqual([moduleRoot.slug]);
    expect(enriched.facets.relationshipTypes).toEqual(["uses"]);
    expect(enriched.facets.relatedTopologyIds).toEqual(
      expect.arrayContaining([groupedQuery.id, moduleRoot.id]),
    );
    expect(enriched.facets.legacyModuleFamily).toBe("attention");
    expect(enriched.facets.legacyConceptType).toBe("attention-variant");
    expect(enriched.facets.legacyVariantGroup).toBe("attention-head-sharing");
    expect(enriched.facets.moduleType).toBe("attention");
    expect(enriched.facets).not.toHaveProperty("optimizes");
  });

  test("does not add AI-only model facets for model records", () => {
    const modelRecord = buildModel();
    const indexes = buildRegistryIndexes([modelRecord]);
    const base = buildSyntheticBase({
      registryId: modelRecord.id,
      kind: "model",
      facets: { kind: "model", tags: [] },
    });

    const enriched = enrichSearchDocument(base, indexes);

    expect(enriched.facets).not.toHaveProperty("modelFamily");
    expect(enriched.facets).not.toHaveProperty("sourceType");
    expect(enriched.facets).not.toHaveProperty("modalities");
    expect(enriched.facets).not.toHaveProperty("trainingRegimeIds");
  });

  test("keeps topology terms searchable through structured data and Orama topology text", () => {
    const moduleRoot = buildClassification({
      id: "classification.module",
      slug: "module",
      parentClassificationId: undefined,
    });
    const attentionFamily = buildClassification({
      id: "classification.module.attention",
      slug: "attention-mechanisms",
      parentClassificationId: moduleRoot.id,
    });
    const groupedQuery = buildClassification({
      id: "classification.module.attention.grouped-query",
      slug: "attention-grouped-query",
      parentClassificationId: attentionFamily.id,
      aliases: ["grouped-query attention", "GQA"],
    });
    const moduleRecord = buildModule();
    const indexes = buildRegistryIndexes([
      moduleRoot,
      attentionFamily,
      groupedQuery,
      moduleRecord,
    ]);
    const enriched = enrichSearchDocument(buildSyntheticBase(), indexes);

    const topologyText = topologySearchText(enriched);
    expect(topologyText).toContain("attention-grouped-query");
    expect(topologyText).toContain("attentionmechanisms");

    const structuredData = toStructuredData(enriched);
    const searchableBlocks = structuredData.contents.map(
      (block) => block.content,
    );
    expect(searchableBlocks.join("\n")).toContain("attention-grouped-query");

    const oramaRecord = toOramaRecord(enriched);
    expect(oramaRecord.topology).toContain("attention-grouped-query");
  });

  test("keeps draft classifications out of topology and missing relationship targets non-fatal", () => {
    const draftClassification = buildClassification({
      id: "classification.module.attention.draft-variant",
      slug: "draft-variant",
      status: "draft",
      parentClassificationId: "classification.module.attention",
    });
    const attentionFamily = buildClassification({
      id: "classification.module.attention",
      slug: "attention-mechanisms",
      parentClassificationId: "classification.module",
    });
    const moduleRoot = buildClassification({
      id: "classification.module",
      slug: "module",
      parentClassificationId: undefined,
    });
    const moduleRecord = buildModule({
      primaryClassificationId: draftClassification.id,
      relationships: [
        {
          relationshipType: "related",
          targetId: "module.missing-neighbor",
        },
      ],
    });
    const indexes = buildRegistryIndexes([
      moduleRoot,
      attentionFamily,
      draftClassification,
      moduleRecord,
    ]);

    const enriched = enrichSearchDocument(buildSyntheticBase(), indexes);

    expect(enriched.title).toBe("Synthetic Module");
    expect(enriched.topology.primaryClassification).toBeUndefined();
    expect(enriched.topology.classificationIds).toEqual([]);
    expect(enriched.topology.relationships).toEqual([
      {
        relationshipType: "related",
        targetId: "module.missing-neighbor",
        targetKind: undefined,
        targetSlug: undefined,
        targetAliases: [],
      },
    ]);
    expect(enriched.facets.primaryClassificationId).toBe(
      draftClassification.id,
    );
    expect(enriched.facets.classificationIds).toEqual([]);
  });

  test("composes with base construction for shipped grouped-query attention parity fields", async () => {
    const { loadPublishedDocsPages } = await import("@/lib/content/pages");
    const { loadRegistry } = await import("@/lib/content/registry");
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/modules/grouped-query-attention",
    );
    expect(page).toBeDefined();
    if (!page) {
      throw new Error("Missing grouped-query attention page");
    }

    const base = buildBaseSearchDocument(page, registry);
    const enriched = enrichSearchDocument(base, registry);

    expect(enriched.facets.primaryClassificationId).toBe(
      "classification.module.attention.grouped-query",
    );
    expect(enriched.facets.moduleType).toBe("attention");
    expect(enriched.topology.terms).toEqual(
      expect.arrayContaining(["classification.module.attention.grouped-query"]),
    );
  });
});
