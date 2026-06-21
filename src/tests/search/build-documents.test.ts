import { describe, expect, test } from "bun:test";
import type { DocsPageSource } from "@/lib/content/pages";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry, type RegistryIndexes } from "@/lib/content/registry";
import type { ClassificationRecord, ModuleRecord } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const SAMPLE_URL = "/docs/modules/grouped-query-attention";
const TOKEN_GLOSSARY_URL = "/docs/glossary/token";
const RELU_MODULE_URL = "/docs/modules/relu";
const UNIGRAM_TOKENIZER_URL = "/docs/modules/unigram-tokenizer";

function buildRegistryIndexes(records: ModuleRecord[]): RegistryIndexes {
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
    optimizes: [],
    exampleModelIds: [],
    improvesOnIds: [],
    tradeoffIds: [],
    usedByModelIds: [],
    introducedByPaperIds: [],
    mathLevel: "none",
    ...overrides,
  };
}

describe("buildSearchDocuments", () => {
  test("indexes only published docs pages for the default locale", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(documents.length).toBe(pages.length);
    expect(documents.map((document) => document.url).sort()).toEqual(
      pages.map((page) => page.url).sort(),
    );
  });

  test("indexes grouped-query attention sample page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const sample = documents.find((document) => document.url === SAMPLE_URL);

    expect(sample).toBeDefined();
    expect(sample?.title).toBe("Grouped-Query Attention");
    expect(sample?.description).toContain("key-value cache");
    expect(sample?.aliases).toEqual(
      expect.arrayContaining([
        "GQA",
        "grouped-query attention",
        "grouped query attention",
      ]),
    );
    expect(sample?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
    expect(sample?.bodyText).toContain("GQA");
    expect(sample?.bodyText).toContain("key-value cache");
    expect(sample?.registryId).toBe("module.grouped-query-attention");
    expect(sample?.facets.moduleType).toBe("attention");
  });

  test("indexes published token glossary page with title, body text, aliases, and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const token = documents.find(
      (document) => document.url === TOKEN_GLOSSARY_URL,
    );

    expect(token).toBeDefined();
    expect(token?.title).toBe("Token");
    expect(token?.description).toContain("smallest unit");
    expect(token?.kind).toBe("glossary");
    expect(token?.registryId).toBe("concept.token");
    expect(token?.aliases).toEqual(
      expect.arrayContaining(["tokens", "token id", "subword token"]),
    );
    expect(token?.tags).toEqual(expect.arrayContaining(["attention"]));
    expect(token?.bodyText).toContain("tokenizer");
    expect(token?.bodyText).toContain("token IDs");
  });

  test("normalizes topology metadata for seeded ontology records", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const relu = documents.find((document) => document.url === RELU_MODULE_URL);

    expect(relu).toBeDefined();
    expect(relu?.topology.primaryClassificationId).toBe(
      "classification.module.activation",
    );
    expect(relu?.topology.secondaryClassificationIds).toEqual([]);
    expect(relu?.topology.primaryClassification).toEqual(
      expect.objectContaining({
        id: "classification.module.activation",
        slug: "activation-functions",
        label: "activation functions",
        aliases: expect.arrayContaining([
          "activation function",
          "activation family",
        ]),
        terms: expect.arrayContaining([
          "classification.module.activation",
          "classification.activation-functions",
          "activation-functions",
          "activation functions",
          "activation family",
        ]),
      }),
    );
    expect(relu?.topology.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relationshipType: "variant",
          targetId: "concept.activation",
          targetKind: "concept",
          targetSlug: "activation",
          targetAliases: expect.arrayContaining(["activations"]),
        }),
        expect.objectContaining({
          relationshipType: "used-by",
          targetId: "module.standard-ffn",
          targetKind: "module",
          targetSlug: "standard-ffn",
          targetAliases: expect.arrayContaining(["dense FFN"]),
        }),
      ]),
    );
    expect(relu?.topology.terms).toEqual(
      expect.arrayContaining([
        "activation-functions",
        "activation family",
        "variant",
        "concept.activation",
        "activation",
        "used-by",
        "module.standard-ffn",
        "standard-ffn",
        "dense FFN",
      ]),
    );
  });

  test("builds stable empty topology metadata for records without ontology fields", () => {
    const record = buildSyntheticModule();
    const document = buildSearchDocuments(
      [buildSyntheticPage(record.id)],
      buildRegistryIndexes([record]),
    )[0];

    expect(document?.topology).toEqual({
      primaryClassificationId: undefined,
      secondaryClassificationIds: [],
      primaryClassification: undefined,
      secondaryClassifications: [],
      classificationIds: [],
      ancestorClassificationIds: [],
      ancestorClassifications: [],
      rootClassificationIds: [],
      rootClassifications: [],
      relationships: [],
      relatedTopologyIds: [],
      terms: [],
    });
    expect(document?.title).toBe("Synthetic Module");
    expect(document?.facets.moduleType).toBe("other");
  });

  test("keeps documents searchable when classification targets are missing or draft", () => {
    const draftClassification: ClassificationRecord = {
      id: "classification.draft-family",
      slug: "draft-family",
      kind: "classification",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: ["draft family"],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "draft",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      classificationType: "family",
      classifiesKinds: ["module"],
    };
    const record = buildSyntheticModule({
      primaryClassificationId: "classification.missing-family",
      secondaryClassificationIds: [draftClassification.id],
      relationships: [
        {
          relationshipType: "related",
          targetId: "module.missing-neighbor",
        },
      ],
    });
    const indexes = buildRegistryIndexes([record]);
    indexes.byId.set(draftClassification.id, draftClassification);
    indexes.bySlug.set(draftClassification.slug, draftClassification);
    indexes.classificationsById.set(
      draftClassification.id,
      draftClassification,
    );

    const document = buildSearchDocuments(
      [buildSyntheticPage(record.id)],
      indexes,
    )[0];

    expect(document?.topology.primaryClassificationId).toBe(
      "classification.missing-family",
    );
    expect(document?.topology.primaryClassification).toBeUndefined();
    expect(document?.topology.secondaryClassificationIds).toEqual([
      "classification.draft-family",
    ]);
    expect(document?.topology.secondaryClassifications).toEqual([]);
    expect(document?.topology.relationships).toEqual([
      {
        relationshipType: "related",
        targetId: "module.missing-neighbor",
        targetKind: undefined,
        targetSlug: undefined,
        targetAliases: [],
      },
    ]);
    expect(document?.title).toBe("Synthetic Module");
  });

  test("indexes published unigram tokenizer page with tokenizer-specific aliases and body text", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const unigram = documents.find(
      (document) => document.url === UNIGRAM_TOKENIZER_URL,
    );

    expect(unigram).toBeDefined();
    expect(unigram?.title).toBe("Unigram Tokenizer");
    expect(unigram?.description).toContain("highest-scoring");
    expect(unigram?.kind).toBe("module");
    expect(unigram?.registryId).toBe("module.unigram-tokenizer");
    expect(unigram?.aliases).toEqual(
      expect.arrayContaining([
        "unigram tokenizer",
        "unigram tokenization",
        "SentencePiece unigram",
      ]),
    );
    expect(unigram?.tags).toEqual(
      expect.arrayContaining(["foundations", "token-to-probability-chain"]),
    );
    expect(unigram?.bodyText).toContain("SentencePiece-style");
    expect(unigram?.bodyText).toContain("merge-based");
    expect(unigram?.facets.moduleType).toBe("tokenizer");
  });
});
