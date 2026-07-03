import { describe, expect, test } from "bun:test";
import type { RegistryIndexes } from "@/lib/content/registry";
import type {
  ConceptRecord,
  ModelRecord,
  ModuleRecord,
} from "@/lib/content/schemas";
import { enrichSearchDocument } from "./enrich-search-document";
import {
  enrichSearchDocumentsWithModelAtlasAiFacets,
  enrichSearchDocumentWithModelAtlasAiFacets,
} from "./model-atlas-ai-search-enrichment-adapter";
import type { BaseSearchDocument } from "./types";
import { EMPTY_SEARCH_DOCUMENT_TOPOLOGY } from "./types";

function buildRegistryIndexes(
  records: Array<ModuleRecord | ModelRecord | ConceptRecord>,
): RegistryIndexes {
  return {
    byId: new Map(records.map((record) => [record.id, record])),
    bySlug: new Map(records.map((record) => [record.slug, record])),
    classificationsById: new Map(),
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
    optimizes: ["kv-cache", "memory-bandwidth"],
    exampleModelIds: [],
    improvesOnIds: [],
    tradeoffIds: [],
    usedByModelIds: [],
    introducedByPaperIds: [],
    mathLevel: "none",
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

function buildConcept(overrides: Partial<ConceptRecord> = {}): ConceptRecord {
  return {
    id: "concept.synthetic-concept",
    slug: "synthetic-concept",
    kind: "concept",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: [],
    tags: [],
    relatedIds: [],
    citationIds: [],
    status: "published",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    conceptType: "architecture",
    prerequisiteIds: [],
    explainsIds: [],
    ...overrides,
  };
}

describe("enrichSearchDocumentWithModelAtlasAiFacets", () => {
  test("adds model facets for model records", () => {
    const modelRecord = buildModel();
    const indexes = buildRegistryIndexes([modelRecord]);
    const generic = enrichSearchDocument(
      buildSyntheticBase({
        registryId: modelRecord.id,
        kind: "model",
        facets: { kind: "model", tags: [] },
      }),
      indexes,
    );

    const enriched = enrichSearchDocumentWithModelAtlasAiFacets(
      generic,
      indexes,
    );

    expect(enriched.facets.modelFamily).toBe("gpt");
    expect(enriched.facets.sourceType).toBe("closed");
    expect(enriched.facets.modalities).toEqual(["text"]);
    expect(enriched.facets.trainingRegimeIds).toEqual([
      "training-regime.pretraining",
    ]);
    expect(enriched.facets).not.toHaveProperty("optimizes");
  });

  test("adds optimizes for module records", () => {
    const moduleRecord = buildModule();
    const indexes = buildRegistryIndexes([moduleRecord]);
    const generic = enrichSearchDocument(buildSyntheticBase(), indexes);

    const enriched = enrichSearchDocumentWithModelAtlasAiFacets(
      generic,
      indexes,
    );

    expect(enriched.facets.optimizes).toEqual(["kv-cache", "memory-bandwidth"]);
    expect(enriched.facets).not.toHaveProperty("modelFamily");
    expect(enriched.facets).not.toHaveProperty("sourceType");
    expect(enriched.facets).not.toHaveProperty("modalities");
    expect(enriched.facets).not.toHaveProperty("trainingRegimeIds");
  });

  test("preserves generic facets produced before adapter execution", () => {
    const moduleRecord = buildModule({
      moduleFamily: "attention",
      conceptType: "attention-variant",
      variantGroup: "attention-head-sharing",
      primaryClassificationId: "classification.module.attention.grouped-query",
    });
    const indexes = buildRegistryIndexes([moduleRecord]);
    const generic = enrichSearchDocument(buildSyntheticBase(), indexes);

    const enriched = enrichSearchDocumentWithModelAtlasAiFacets(
      generic,
      indexes,
    );

    expect(enriched.facets.kind).toBe("module");
    expect(enriched.facets.tags).toEqual(["attention"]);
    expect(enriched.facets.legacyModuleFamily).toBe("attention");
    expect(enriched.facets.legacyConceptType).toBe("attention-variant");
    expect(enriched.facets.legacyVariantGroup).toBe("attention-head-sharing");
    expect(enriched.facets.optimizes).toEqual(["kv-cache", "memory-bandwidth"]);
  });

  test("leaves concept records unchanged and does not add AI facet keys", () => {
    const conceptRecord = buildConcept();
    const indexes = buildRegistryIndexes([conceptRecord]);
    const generic = enrichSearchDocument(
      buildSyntheticBase({
        registryId: conceptRecord.id,
        kind: "concept",
        facets: { kind: "concept", tags: [] },
      }),
      indexes,
    );

    const enriched = enrichSearchDocumentWithModelAtlasAiFacets(
      generic,
      indexes,
    );

    expect(enriched).toEqual(generic);
    expect(enriched.facets).not.toHaveProperty("modelFamily");
    expect(enriched.facets).not.toHaveProperty("optimizes");
  });

  test("returns the document unchanged when registry id is missing or unknown", () => {
    const indexes = buildRegistryIndexes([]);
    const generic = enrichSearchDocument(
      buildSyntheticBase({ registryId: undefined }),
      indexes,
    );

    expect(
      enrichSearchDocumentWithModelAtlasAiFacets(generic, indexes),
    ).toEqual(generic);
    expect(
      enrichSearchDocumentWithModelAtlasAiFacets(
        enrichSearchDocument(
          buildSyntheticBase({ registryId: "module.missing" }),
          indexes,
        ),
        indexes,
      ),
    ).toEqual(
      enrichSearchDocument(
        buildSyntheticBase({ registryId: "module.missing" }),
        indexes,
      ),
    );
  });

  test("enriches document batches through enrichSearchDocumentsWithModelAtlasAiFacets", () => {
    const moduleRecord = buildModule();
    const modelRecord = buildModel();
    const conceptRecord = buildConcept();
    const indexes = buildRegistryIndexes([
      moduleRecord,
      modelRecord,
      conceptRecord,
    ]);
    const documents = [
      enrichSearchDocument(buildSyntheticBase(), indexes),
      enrichSearchDocument(
        buildSyntheticBase({
          registryId: modelRecord.id,
          kind: "model",
          facets: { kind: "model", tags: [] },
        }),
        indexes,
      ),
      enrichSearchDocument(
        buildSyntheticBase({
          registryId: conceptRecord.id,
          kind: "concept",
          facets: { kind: "concept", tags: [] },
        }),
        indexes,
      ),
    ];

    const enriched = enrichSearchDocumentsWithModelAtlasAiFacets(
      documents,
      indexes,
    );

    expect(enriched[0]?.facets.optimizes).toEqual([
      "kv-cache",
      "memory-bandwidth",
    ]);
    expect(enriched[1]?.facets.modelFamily).toBe("gpt");
    expect(enriched[2]?.facets).not.toHaveProperty("optimizes");
    expect(enriched[2]?.facets).not.toHaveProperty("modelFamily");
  });
});
