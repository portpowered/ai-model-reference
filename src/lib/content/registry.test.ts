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
  moduleType: "attention",
  optimizes: ["kv-cache"],
  practicalBenefits: ["lower memory"],
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

    const citation = indexes.byId.get("citation.gqa-paper");
    expect(citation?.kind).toBe("citation");
    expect(indexes.bySlug.get("gqa-paper")?.id).toBe("citation.gqa-paper");

    const concept = indexes.byId.get("concept.token");
    expect(concept?.kind).toBe("concept");
    expect(indexes.bySlug.get("token")?.id).toBe("concept.token");

    expect(indexes.tagsBySlug.get("kv-cache")?.id).toBe("tag.kv-cache");
    expect(module?.tags).toContain("kv-cache");
  });

  test("loads concept records from the concepts directory", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", "concept-registry");
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, "modules"), { recursive: true });
    await mkdir(join(tempRoot, "concepts"), { recursive: true });
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
