import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry, RegistryLoadError } from "./registry";

const validModuleRecord = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  kind: "module",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GQA"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: ["citation.gqa-paper"],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  primaryClassificationId: "classification.module.attention",
  moduleType: "attention",
  optimizes: ["kv-cache"],
  exampleModelIds: [],
  improvesOnIds: [],
  tradeoffIds: [],
  usedByModelIds: [],
  introducedByPaperIds: [],
  mathLevel: "light",
};

const validTagRecord = {
  id: "tag.attention",
  slug: "attention",
  kind: "tag",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["self-attention"],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  category: "module-type",
  landingPage: "generated-tag-page",
};

const validConceptRecord = {
  id: "concept.token",
  slug: "token",
  kind: "concept",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["tokenizer token"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  conceptType: "architecture",
  prerequisiteIds: [],
  explainsIds: [],
};

const validClassificationRecord = {
  id: "classification.module.activation",
  slug: "activation-functions",
  kind: "classification",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["activation family"],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  classificationType: "family",
  classifiesKinds: ["module"],
  parentClassificationId: "classification.module",
  legacyIds: ["classification.activation-functions"],
};

const validModuleRootClassificationRecord = {
  ...validClassificationRecord,
  id: "classification.module",
  slug: "module",
  aliases: [],
  classificationType: "domain",
  classifiesKinds: ["module"],
  parentClassificationId: undefined,
  legacyIds: ["classification.neural-network-components"],
};

const validAttentionClassificationRecord = {
  ...validClassificationRecord,
  id: "classification.module.attention",
  slug: "attention-mechanisms",
  aliases: ["attention family"],
  parentClassificationId: "classification.module",
  legacyIds: ["classification.attention-mechanisms"],
};

const validCitationRecord = {
  id: "citation.gqa-paper",
  slug: "gqa-paper",
  kind: "citation",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  citationType: "paper",
  authors: ["Ainslie et al."],
  title: "GQA: Training Generalized Multi-Query Transformer Models",
  url: "https://arxiv.org/abs/2305.13245",
  mla: 'Ainslie, Joshua, et al. "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints." arXiv, 2023.',
  year: 2023,
};

const validModelRecord = {
  id: "model.demo",
  slug: "demo",
  kind: "model",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["demo-model"],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  family: "demo",
  sourceType: "open-weights",
  modalities: ["text"],
  architectureIds: [],
  moduleIds: [],
  trainingRegimeIds: [],
  datasetIds: [],
  paperIds: [],
};

const validPaperRecord = {
  id: "paper.demo",
  slug: "demo-paper",
  kind: "paper",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  authors: ["A. Author"],
  publishedAt: "2024-01-01",
  url: "https://example.com/paper",
  introducesIds: [],
  supportsIds: [],
  arguesAgainstIds: [],
  modelIds: [],
  moduleIds: [],
  conceptIds: [],
};

const validTrainingRegimeRecord = {
  id: "training-regime.demo",
  slug: "demo-training",
  kind: "training-regime",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  regimeType: "pretraining",
  usedByModelIds: [],
  relatedModuleIds: [],
  paperIds: [],
};

describe("loadRegistry", () => {
  test("loads Phase 1 baseline records and indexes them by id and slug", async () => {
    const indexes = await loadRegistry();

    const module = indexes.byId.get("module.grouped-query-attention");
    expect(module?.kind).toBe("module");
    expect(indexes.bySlug.get("grouped-query-attention")?.id).toBe(
      "module.grouped-query-attention",
    );

    const tag = indexes.byId.get("tag.attention");
    expect(tag?.kind).toBe("tag");
    expect(indexes.tagsById.get("tag.attention")?.slug).toBe("attention");
    expect(indexes.tagsBySlug.get("attention")?.id).toBe("tag.attention");
    expect(indexes.bySlug.get("attention")?.id).toBe("tag.attention");
    expect(indexes.byId.get("module.attention")?.slug).toBe("attention");

    const citation = indexes.byId.get("citation.gqa-paper");
    expect(citation?.kind).toBe("citation");
    expect(indexes.bySlug.get("gqa-paper")?.id).toBe("citation.gqa-paper");

    const concept = indexes.byId.get("concept.token");
    expect(concept?.kind).toBe("concept");
    expect(indexes.bySlug.get("token")?.id).toBe("concept.token");

    const byteLevelTokenization = indexes.byId.get(
      "module.byte-level-tokenization",
    );
    expect(byteLevelTokenization?.kind).toBe("module");
    expect(indexes.bySlug.get("byte-level-tokenization")?.id).toBe(
      "module.byte-level-tokenization",
    );

    const tokenizationTag = indexes.byId.get("tag.tokenization");
    expect(tokenizationTag?.kind).toBe("tag");
    expect(indexes.tagsBySlug.get("tokenization")?.id).toBe("tag.tokenization");

    expect(indexes.tagsBySlug.get("kv-cache")?.id).toBe("tag.kv-cache");
    expect(module?.tags).toContain("kv-cache");
    expect(byteLevelTokenization?.tags).toContain("tokenization");

    const conceptMapGraph = indexes.byId.get("graph.token-concept-map");
    expect(conceptMapGraph?.kind).toBe("graph");
    if (conceptMapGraph?.kind === "graph") {
      expect(conceptMapGraph.graphType).toBe("concept-map");
      expect(conceptMapGraph.subjectId).toBe("concept.token");
    }
  });

  test("loads concept records from the concepts directory", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", "concept-registry");
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "modules"), { recursive: true });
    await mkdir(join(tempRoot, "concepts"), { recursive: true });
    await mkdir(join(tempRoot, "classifications"), { recursive: true });
    await mkdir(join(tempRoot, "tags"), { recursive: true });
    await mkdir(join(tempRoot, "citations"), { recursive: true });

    await writeFile(
      join(tempRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify(validModuleRecord),
    );
    await writeFile(
      join(tempRoot, "concepts", "token.json"),
      JSON.stringify(validConceptRecord),
    );
    await writeFile(
      join(tempRoot, "classifications", "module.json"),
      JSON.stringify(validModuleRootClassificationRecord),
    );
    await writeFile(
      join(tempRoot, "classifications", "attention.json"),
      JSON.stringify(validAttentionClassificationRecord),
    );
    await writeFile(
      join(tempRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(tempRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const indexes = await loadRegistry({ registryRoot: tempRoot });
    const concept = indexes.byId.get("concept.token");
    expect(concept?.kind).toBe("concept");
    expect(indexes.bySlug.get("token")?.id).toBe("concept.token");

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("loads classification records from the classifications directory", async () => {
    const tempRoot = join(
      import.meta.dir,
      "__fixtures__",
      "classification-registry",
    );
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "modules"), { recursive: true });
    await mkdir(join(tempRoot, "classifications"), { recursive: true });
    await mkdir(join(tempRoot, "tags"), { recursive: true });
    await mkdir(join(tempRoot, "citations"), { recursive: true });

    await writeFile(
      join(tempRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        primaryClassificationId: "classification.module.activation",
        moduleType: "activation",
      }),
    );
    await writeFile(
      join(tempRoot, "classifications", "module.json"),
      JSON.stringify(validModuleRootClassificationRecord),
    );
    await writeFile(
      join(tempRoot, "classifications", "attention.json"),
      JSON.stringify(validAttentionClassificationRecord),
    );
    await writeFile(
      join(tempRoot, "classifications", "activation-functions.json"),
      JSON.stringify(validClassificationRecord),
    );
    await writeFile(
      join(tempRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(tempRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const indexes = await loadRegistry({ registryRoot: tempRoot });
    expect(indexes.byId.get("classification.module.activation")?.kind).toBe(
      "classification",
    );
    expect(indexes.byId.get("classification.activation-functions")?.kind).toBe(
      "classification",
    );
    expect(
      indexes.classificationsById.get("classification.activation-functions")
        ?.id,
    ).toBe("classification.module.activation");
    expect(
      indexes.classificationsById.get("classification.module.activation")?.slug,
    ).toBe("activation-functions");

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("loads model, paper, and training-regime records from their registry directories", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", "extended-registry");
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "models"), { recursive: true });
    await mkdir(join(tempRoot, "papers"), { recursive: true });
    await mkdir(join(tempRoot, "training-regimes"), { recursive: true });

    await writeFile(
      join(tempRoot, "models", "demo.json"),
      JSON.stringify(validModelRecord),
    );
    await writeFile(
      join(tempRoot, "papers", "demo-paper.json"),
      JSON.stringify(validPaperRecord),
    );
    await writeFile(
      join(tempRoot, "training-regimes", "demo-training.json"),
      JSON.stringify(validTrainingRegimeRecord),
    );

    const indexes = await loadRegistry({ registryRoot: tempRoot });

    expect(indexes.byId.get("model.demo")?.kind).toBe("model");
    expect(indexes.bySlug.get("demo")?.id).toBe("model.demo");
    expect(indexes.byId.get("paper.demo")?.kind).toBe("paper");
    expect(indexes.byId.get("training-regime.demo")?.kind).toBe(
      "training-regime",
    );

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("rejects ontology participants that reference missing classifications", async () => {
    const tempRoot = join(
      import.meta.dir,
      "__fixtures__",
      "invalid-ontology-registry",
    );
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "modules"), { recursive: true });
    await mkdir(join(tempRoot, "tags"), { recursive: true });
    await mkdir(join(tempRoot, "citations"), { recursive: true });

    await writeFile(
      join(tempRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        primaryClassificationId: "classification.missing",
      }),
    );
    await writeFile(
      join(tempRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(tempRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    await expect(
      loadRegistry({ registryRoot: tempRoot }),
    ).rejects.toMatchObject({
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            "primaryClassificationId must reference a classification record",
          ),
        }),
      ]),
    });

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("rejects classifications that do not use the canonical dotted namespace format", async () => {
    const tempRoot = join(
      import.meta.dir,
      "__fixtures__",
      "invalid-classification-id-registry",
    );
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "classifications"), { recursive: true });

    await writeFile(
      join(tempRoot, "classifications", "attention.json"),
      JSON.stringify({
        ...validClassificationRecord,
        id: "classification.attention-mechanisms",
        slug: "attention-mechanisms",
        parentClassificationId: undefined,
        legacyIds: undefined,
      }),
    );

    await expect(
      loadRegistry({ registryRoot: tempRoot }),
    ).rejects.toMatchObject({
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            "classification id must use the canonical dotted namespace format",
          ),
        }),
      ]),
    });

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("rejects classifications whose parentClassificationId skips the direct namespace parent", async () => {
    const tempRoot = join(
      import.meta.dir,
      "__fixtures__",
      "invalid-classification-parent-registry",
    );
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "classifications"), { recursive: true });

    await writeFile(
      join(tempRoot, "classifications", "module.json"),
      JSON.stringify({
        ...validClassificationRecord,
        id: "classification.module",
        slug: "module",
        aliases: [],
        classificationType: "domain",
        classifiesKinds: ["module"],
        parentClassificationId: undefined,
        legacyIds: undefined,
      }),
    );
    await writeFile(
      join(tempRoot, "classifications", "attention.json"),
      JSON.stringify({
        ...validClassificationRecord,
        id: "classification.module.attention",
        slug: "attention-mechanisms",
        parentClassificationId: "classification.module",
        legacyIds: ["classification.attention-mechanisms"],
      }),
    );
    await writeFile(
      join(tempRoot, "classifications", "grouped-query.json"),
      JSON.stringify({
        ...validClassificationRecord,
        id: "classification.module.attention.grouped-query",
        slug: "attention-grouped-query",
        parentClassificationId: "classification.module",
        legacyIds: undefined,
      }),
    );

    await expect(
      loadRegistry({ registryRoot: tempRoot }),
    ).rejects.toMatchObject({
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            'must reference its direct namespace parent "classification.module.attention"',
          ),
        }),
      ]),
    });

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("rejects classifications whose parentClassificationId crosses ontology domains", async () => {
    const tempRoot = join(
      import.meta.dir,
      "__fixtures__",
      "cross-domain-classification-registry",
    );
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "classifications"), { recursive: true });

    await writeFile(
      join(tempRoot, "classifications", "concept.json"),
      JSON.stringify({
        ...validClassificationRecord,
        id: "classification.concept",
        slug: "concept",
        aliases: [],
        classificationType: "domain",
        classifiesKinds: ["concept"],
        parentClassificationId: undefined,
        legacyIds: undefined,
      }),
    );
    await writeFile(
      join(tempRoot, "classifications", "module.json"),
      JSON.stringify({
        ...validClassificationRecord,
        id: "classification.module",
        slug: "module",
        aliases: [],
        classificationType: "domain",
        classifiesKinds: ["module"],
        parentClassificationId: undefined,
        legacyIds: undefined,
      }),
    );
    await writeFile(
      join(tempRoot, "classifications", "attention.json"),
      JSON.stringify({
        ...validClassificationRecord,
        id: "classification.module.attention",
        slug: "attention-mechanisms",
        parentClassificationId: "classification.concept",
        legacyIds: ["classification.attention-mechanisms"],
      }),
    );

    await expect(
      loadRegistry({ registryRoot: tempRoot }),
    ).rejects.toMatchObject({
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            'must reference its direct namespace parent "classification.module"',
          ),
        }),
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            'must stay within the "module" domain',
          ),
        }),
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            'must match parent "classification.concept" classifiesKinds',
          ),
        }),
      ]),
    });

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("rejects ontology relationships that point at missing records", async () => {
    const tempRoot = join(
      import.meta.dir,
      "__fixtures__",
      "invalid-ontology-relationships",
    );
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "modules"), { recursive: true });
    await mkdir(join(tempRoot, "classifications"), { recursive: true });
    await mkdir(join(tempRoot, "tags"), { recursive: true });
    await mkdir(join(tempRoot, "citations"), { recursive: true });

    await writeFile(
      join(tempRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        primaryClassificationId: "classification.activation-functions",
        relationships: [
          {
            relationshipType: "uses",
            targetId: "module.missing-target",
          },
        ],
      }),
    );
    await writeFile(
      join(tempRoot, "classifications", "activation-functions.json"),
      JSON.stringify(validClassificationRecord),
    );
    await writeFile(
      join(tempRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(tempRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    await expect(
      loadRegistry({ registryRoot: tempRoot }),
    ).rejects.toMatchObject({
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            'relationships targetId references missing record "module.missing-target"',
          ),
        }),
      ]),
    });

    await rm(tempRoot, { recursive: true, force: true });
  });
});

describe("loadRegistry duplicate detection", () => {
  const tempRoot = join(import.meta.dir, "__fixtures__", "duplicate-registry");

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function writeFixtureRegistry(files: {
    modules?: Record<string, unknown>[];
    concepts?: Record<string, unknown>[];
    tags?: Record<string, unknown>[];
    citations?: Record<string, unknown>[];
  }) {
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "modules"), { recursive: true });
    await mkdir(join(tempRoot, "concepts"), { recursive: true });
    await mkdir(join(tempRoot, "tags"), { recursive: true });
    await mkdir(join(tempRoot, "citations"), { recursive: true });

    for (const [index, record] of (files.modules ?? []).entries()) {
      await writeFile(
        join(tempRoot, "modules", `module-${index}.json`),
        JSON.stringify(record),
      );
    }
    for (const [index, record] of (files.concepts ?? []).entries()) {
      await writeFile(
        join(tempRoot, "concepts", `concept-${index}.json`),
        JSON.stringify(record),
      );
    }
    for (const [index, record] of (files.tags ?? []).entries()) {
      await writeFile(
        join(tempRoot, "tags", `tag-${index}.json`),
        JSON.stringify(record),
      );
    }
    for (const [index, record] of (files.citations ?? []).entries()) {
      await writeFile(
        join(tempRoot, "citations", `citation-${index}.json`),
        JSON.stringify(record),
      );
    }
  }

  test("throws a structured error when duplicate ids are loaded", async () => {
    const duplicateModule = {
      ...validModuleRecord,
      slug: "grouped-query-attention-alt",
    };
    await writeFixtureRegistry({
      modules: [validModuleRecord, duplicateModule],
      tags: [validTagRecord],
      citations: [validCitationRecord],
    });

    await expect(
      loadRegistry({ registryRoot: tempRoot }),
    ).rejects.toMatchObject({
      name: "RegistryLoadError",
      details: [
        {
          type: "duplicate-id",
          id: "module.grouped-query-attention",
        },
      ],
    });
  });

  test("throws a structured error when duplicate slugs are loaded", async () => {
    const duplicateSlugModule = {
      ...validModuleRecord,
      id: "module.grouped-query-attention-copy",
    };
    await writeFixtureRegistry({
      modules: [validModuleRecord, duplicateSlugModule],
      tags: [validTagRecord],
      citations: [validCitationRecord],
    });

    try {
      await loadRegistry({ registryRoot: tempRoot });
      expect.unreachable("expected duplicate slug error");
    } catch (error) {
      expect(error).toBeInstanceOf(RegistryLoadError);
      const loadError = error as RegistryLoadError;
      expect(loadError.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "duplicate-slug",
            slug: "grouped-query-attention",
          }),
        ]),
      );
    }
  });
});
