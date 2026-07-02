import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry, RegistryLoadError } from "./registry";

const fixtureRoot = join(
  import.meta.dir,
  "__fixtures__",
  "loader-error-compat",
);

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

async function writeMinimalRegistry(
  subdirectory: string,
  files: Record<string, unknown>,
): Promise<void> {
  const root = join(fixtureRoot, subdirectory);
  await rm(root, { recursive: true, force: true });
  for (const [collection, records] of Object.entries(files)) {
    await mkdir(join(root, collection), { recursive: true });
    for (const [fileName, record] of Object.entries(
      records as Record<string, unknown>,
    )) {
      await writeFile(join(root, collection, fileName), JSON.stringify(record));
    }
  }
}

afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

describe("registry loader error compatibility unchanged after core type split", () => {
  test("rejects ontology participants that reference missing classifications", async () => {
    await writeMinimalRegistry("missing-classification", {
      modules: {
        "grouped-query-attention.json": {
          ...validModuleRecord,
          primaryClassificationId: "classification.missing",
        },
      },
      tags: { "attention.json": validTagRecord },
      citations: { "gqa-paper.json": validCitationRecord },
    });

    await expect(
      loadRegistry({
        registryRoot: join(fixtureRoot, "missing-classification"),
      }),
    ).rejects.toMatchObject({
      name: "RegistryLoadError",
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            "primaryClassificationId must reference a classification record",
          ),
        }),
      ]),
    });
  });

  test("rejects ontology relationships that point at missing records", async () => {
    await writeMinimalRegistry("missing-relationship-target", {
      modules: {
        "grouped-query-attention.json": {
          ...validModuleRecord,
          primaryClassificationId: "classification.module.activation",
          relationships: [
            {
              relationshipType: "uses",
              targetId: "module.missing-target",
            },
          ],
        },
      },
      classifications: {
        "activation-functions.json": validClassificationRecord,
      },
      tags: { "attention.json": validTagRecord },
      citations: { "gqa-paper.json": validCitationRecord },
    });

    await expect(
      loadRegistry({
        registryRoot: join(fixtureRoot, "missing-relationship-target"),
      }),
    ).rejects.toMatchObject({
      name: "RegistryLoadError",
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            'relationships targetId references missing record "module.missing-target"',
          ),
        }),
      ]),
    });
  });

  test("rejects classifications with non-canonical dotted namespace ids", async () => {
    await writeMinimalRegistry("invalid-classification-id", {
      classifications: {
        "attention.json": {
          ...validClassificationRecord,
          id: "classification.attention-mechanisms",
          slug: "attention-mechanisms",
          parentClassificationId: undefined,
          legacyIds: undefined,
        },
      },
    });

    await expect(
      loadRegistry({
        registryRoot: join(fixtureRoot, "invalid-classification-id"),
      }),
    ).rejects.toMatchObject({
      name: "RegistryLoadError",
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            "classification id must use the canonical dotted namespace format",
          ),
        }),
      ]),
    });
  });

  test("rejects classifications whose parentClassificationId skips the direct namespace parent", async () => {
    await writeMinimalRegistry("invalid-classification-parent", {
      classifications: {
        "module.json": {
          ...validClassificationRecord,
          id: "classification.module",
          slug: "module",
          aliases: [],
          classificationType: "domain",
          classifiesKinds: ["module"],
          parentClassificationId: undefined,
          legacyIds: undefined,
        },
        "attention.json": {
          ...validClassificationRecord,
          id: "classification.module.attention",
          slug: "attention-mechanisms",
          parentClassificationId: "classification.module",
          legacyIds: ["classification.attention-mechanisms"],
        },
        "grouped-query.json": {
          ...validClassificationRecord,
          id: "classification.module.attention.grouped-query",
          slug: "attention-grouped-query",
          parentClassificationId: "classification.module",
          legacyIds: undefined,
        },
      },
    });

    await expect(
      loadRegistry({
        registryRoot: join(fixtureRoot, "invalid-classification-parent"),
      }),
    ).rejects.toMatchObject({
      name: "RegistryLoadError",
      details: expect.arrayContaining([
        expect.objectContaining({
          type: "parse-error",
          message: expect.stringContaining(
            'must reference its direct namespace parent "classification.module.attention"',
          ),
        }),
      ]),
    });
  });

  test("throws structured duplicate-id errors", async () => {
    const duplicateModule = {
      ...validModuleRecord,
      slug: "grouped-query-attention-alt",
    };
    await writeMinimalRegistry("duplicate-id", {
      modules: {
        "module-a.json": validModuleRecord,
        "module-b.json": duplicateModule,
      },
      tags: { "attention.json": validTagRecord },
      citations: { "gqa-paper.json": validCitationRecord },
    });

    await expect(
      loadRegistry({ registryRoot: join(fixtureRoot, "duplicate-id") }),
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

  test("throws structured duplicate-slug errors", async () => {
    const duplicateSlugModule = {
      ...validModuleRecord,
      id: "module.grouped-query-attention-copy",
    };
    await writeMinimalRegistry("duplicate-slug", {
      modules: {
        "module-a.json": validModuleRecord,
        "module-b.json": duplicateSlugModule,
      },
      tags: { "attention.json": validTagRecord },
      citations: { "gqa-paper.json": validCitationRecord },
    });

    try {
      await loadRegistry({ registryRoot: join(fixtureRoot, "duplicate-slug") });
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
