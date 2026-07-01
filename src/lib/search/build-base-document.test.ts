import { describe, expect, test } from "bun:test";
import type { DocsPageSource } from "@/lib/content/pages";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry, type RegistryIndexes } from "@/lib/content/registry";
import type { ModelRecord, ModuleRecord } from "@/lib/content/schemas";
import {
  buildBaseSearchDocument,
  buildBaseSearchDocuments,
} from "./build-base-document";
import { EMPTY_SEARCH_DOCUMENT_TOPOLOGY } from "./types";

const SAMPLE_URL = "/docs/modules/grouped-query-attention";

function buildRegistryIndexes(
  records: Array<ModuleRecord | ModelRecord>,
): RegistryIndexes {
  return {
    byId: new Map(records.map((record) => [record.id, record])),
    bySlug: new Map(records.map((record) => [record.slug, record])),
    classificationsById: new Map(),
    tagsById: new Map(),
    tagsBySlug: new Map(),
  };
}

function buildSyntheticPage(registryId: string): DocsPageSource {
  return {
    pageDir: "/tmp/synthetic-module",
    docsSlug: "modules/synthetic-module",
    url: "/docs/modules/synthetic-module",
    frontmatter: {
      kind: "module",
      registryId,
      messageNamespace: "local",
      assetNamespace: "local",
      tags: [],
      status: "published",
      updatedAt: "2026-06-20T00:00:00.000Z",
    },
    messages: {
      title: "Synthetic Module",
      description: "Synthetic module description",
    },
  };
}

function buildSyntheticModule(
  overrides: Partial<ModuleRecord> = {},
): ModuleRecord {
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
    primaryClassificationId: "classification.module.attention",
    relationships: [
      {
        relationshipType: "related",
        targetId: "module.missing-neighbor",
      },
    ],
    ...overrides,
  };
}

function buildSyntheticModel(
  overrides: Partial<ModelRecord> = {},
): ModelRecord {
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

describe("buildBaseSearchDocument", () => {
  test("produces stable page fields from docs pages and registry records", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.url === SAMPLE_URL);
    expect(page).toBeDefined();
    if (!page) {
      throw new Error(`Missing sample page at ${SAMPLE_URL}`);
    }

    const document = buildBaseSearchDocument(page, registry);

    expect(document.id).toBe(page.url);
    expect(document.registryId).toBe("module.grouped-query-attention");
    expect(document.url).toBe(SAMPLE_URL);
    expect(document.kind).toBe("module");
    expect(document.title).toBe("Grouped-Query Attention");
    expect(document.description).toContain("key-value cache");
    expect(document.bodyText).toContain("GQA");
    expect(document.headings.length).toBeGreaterThan(0);
    expect(document.directAliases).toEqual(
      expect.arrayContaining([
        "GQA",
        "grouped-query attention",
        "grouped query attention",
      ]),
    );
    expect(document.aliases).toEqual(
      expect.arrayContaining([
        "GQA",
        "grouped-query attention",
        "grouped query attention",
        "attention",
        "kv-cache",
      ]),
    );
    expect(document.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
    expect(document.relatedIds.length).toBeGreaterThan(0);
  });

  test("does not compute ontology, model, or module optimization facets", () => {
    const moduleRecord = buildSyntheticModule({
      moduleFamily: "attention",
      conceptType: "attention-variant",
      variantGroup: "attention-head-sharing",
    });
    const modelRecord = buildSyntheticModel();
    const indexes = buildRegistryIndexes([moduleRecord, modelRecord]);

    const moduleDocument = buildBaseSearchDocument(
      buildSyntheticPage(moduleRecord.id),
      indexes,
    );
    const modelDocument = buildBaseSearchDocument(
      {
        ...buildSyntheticPage(modelRecord.id),
        frontmatter: {
          ...buildSyntheticPage(modelRecord.id).frontmatter,
          kind: "model",
        },
      },
      indexes,
    );

    expect(moduleDocument.facets).toEqual({
      kind: "module",
      tags: [],
    });
    expect(moduleDocument.topology).toEqual(EMPTY_SEARCH_DOCUMENT_TOPOLOGY);
    expect(moduleDocument.facets).not.toHaveProperty("moduleType");
    expect(moduleDocument.facets).not.toHaveProperty("optimizes");
    expect(moduleDocument.facets).not.toHaveProperty("primaryClassificationId");
    expect(moduleDocument.facets).not.toHaveProperty("legacyModuleFamily");

    expect(modelDocument.facets).toEqual({
      kind: "model",
      tags: [],
    });
    expect(modelDocument.topology).toEqual(EMPTY_SEARCH_DOCUMENT_TOPOLOGY);
    expect(modelDocument.facets).not.toHaveProperty("modelFamily");
    expect(modelDocument.facets).not.toHaveProperty("sourceType");
    expect(modelDocument.facets).not.toHaveProperty("modalities");
    expect(modelDocument.facets).not.toHaveProperty("trainingRegimeIds");
  });

  test("keeps pages without ontology fields searchable with empty topology and generic facets", () => {
    const record = buildSyntheticModule({
      primaryClassificationId: undefined,
      secondaryClassificationIds: undefined,
      relationships: undefined,
      optimizes: undefined,
    });
    const document = buildBaseSearchDocuments(
      [buildSyntheticPage(record.id)],
      buildRegistryIndexes([record]),
    )[0];

    expect(document?.topology).toEqual(EMPTY_SEARCH_DOCUMENT_TOPOLOGY);
    expect(document?.facets).toEqual({
      kind: "module",
      tags: [],
    });
    expect(document?.title).toBe("Synthetic Module");
    expect(document?.aliases).toEqual([]);
    expect(document?.relatedIds).toEqual([]);
  });
});
