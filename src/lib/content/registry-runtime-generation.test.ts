import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getProjectRoot } from "./content-paths";
import {
  generateRegistryRuntimeSource,
  writeGeneratedRegistryRuntimeModule,
} from "./registry-runtime-generation";

async function createTempRegistryRoot(): Promise<{
  outputPath: string;
  registryRoot: string;
  tempRoot: string;
}> {
  const tempRootParent = join(getProjectRoot(), ".claude");
  await mkdir(tempRootParent, { recursive: true });
  const tempRoot = await mkdtemp(
    join(tempRootParent, "registry-runtime-generation-"),
  );
  const registryRoot = join(tempRoot, "registry");

  for (const directory of [
    "modules",
    "concepts",
    "models",
    "classifications",
    "papers",
    "training-regimes",
    "systems",
    "datasets",
    "organizations",
    "tags",
    "citations",
  ]) {
    await mkdir(join(registryRoot, directory), { recursive: true });
  }

  return {
    tempRoot,
    registryRoot,
    outputPath: join(tempRoot, "registry-runtime.generated.ts"),
  };
}

async function writeRegistryJson(
  registryRoot: string,
  directory: string,
  fileName: string,
  record: Record<string, unknown>,
) {
  await writeFile(
    join(registryRoot, directory, fileName),
    JSON.stringify(record),
  );
}

async function importGeneratedRuntime(outputPath: string) {
  return (await import(
    `${pathToFileURL(outputPath).href}?t=${Date.now()}-${crypto.randomUUID()}`
  )) as typeof import("./registry-runtime");
}

async function writeAttentionClassificationFixture(registryRoot: string) {
  await writeRegistryJson(registryRoot, "classifications", "module.json", {
    id: "classification.module",
    slug: "module",
    kind: "classification",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: [],
    tags: [],
    relatedIds: [],
    citationIds: [],
    status: "published",
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    classificationType: "domain",
    classifiesKinds: ["module"],
  });
  await writeRegistryJson(
    registryRoot,
    "classifications",
    "attention-mechanisms.json",
    {
      id: "classification.module.attention",
      slug: "attention-mechanisms",
      kind: "classification",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: ["attention"],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-21T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
      classificationType: "family",
      classifiesKinds: ["module"],
      parentClassificationId: "classification.module",
      legacyIds: ["classification.attention-mechanisms"],
    },
  );
}

describe("registry-runtime generation", () => {
  test("generated runtime resolves a newly added citation without manual runtime edits", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeRegistryJson(
        registryRoot,
        "citations",
        "runtime-generated-citation.json",
        {
          id: "citation.runtime-generated-citation",
          slug: "runtime-generated-citation",
          kind: "citation",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: ["runtime generated citation"],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          citationType: "paper",
          authors: ["R. Author"],
          title: "Runtime Generated Citation",
          url: "https://example.com/runtime-generated-citation",
          mla: "Author, R. Runtime Generated Citation.",
          year: 2026,
        },
      );

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);
      const ids = generatedRuntime
        .listCitationRecords()
        .map((record) => record.id);

      expect(ids).toContain("citation.runtime-generated-citation");
      expect(
        generatedRuntime.getCitationById("citation.runtime-generated-citation")
          ?.title,
      ).toBe("Runtime Generated Citation");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime resolves a newly added tag without manual runtime edits", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeRegistryJson(
        registryRoot,
        "tags",
        "runtime-generated-tag.json",
        {
          id: "tag.runtime-generated-tag",
          slug: "runtime-generated-tag",
          kind: "tag",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: ["runtime generated tag"],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          category: "architecture",
          landingPage: "generated-tag-page",
        },
      );

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);
      const ids = generatedRuntime.listTagRecords().map((record) => record.id);

      expect(ids).toContain("tag.runtime-generated-tag");
      expect(
        generatedRuntime.getTagById("tag.runtime-generated-tag")?.slug,
      ).toBe("runtime-generated-tag");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime preparation fails fast for invalid tag registry JSON", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeRegistryJson(
        registryRoot,
        "tags",
        "runtime-invalid-tag.json",
        {
          id: "tag.runtime-invalid-tag",
          slug: "runtime-invalid-tag",
          kind: "tag",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: ["runtime invalid tag"],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          category: "architecture",
        },
      );

      await expect(
        generateRegistryRuntimeSource({
          outputPath,
          projectRoot: getProjectRoot(),
          registryRoot,
        }),
      ).rejects.toThrow(/runtime-invalid-tag\.json/);
      await expect(
        generateRegistryRuntimeSource({
          outputPath,
          projectRoot: getProjectRoot(),
          registryRoot,
        }),
      ).rejects.toThrow(/landingPage/);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime preparation fails fast for invalid citation registry JSON", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeRegistryJson(
        registryRoot,
        "citations",
        "runtime-invalid-citation.json",
        {
          id: "citation.runtime-invalid-citation",
          slug: "runtime-invalid-citation",
          kind: "citation",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: ["runtime invalid citation"],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          citationType: "paper",
          authors: ["R. Author"],
          title: "Runtime Invalid Citation",
          url: "https://example.com/runtime-invalid-citation",
          year: 2026,
        },
      );

      await expect(
        generateRegistryRuntimeSource({
          outputPath,
          projectRoot: getProjectRoot(),
          registryRoot,
        }),
      ).rejects.toThrow(/runtime-invalid-citation\.json/);
      await expect(
        generateRegistryRuntimeSource({
          outputPath,
          projectRoot: getProjectRoot(),
          registryRoot,
        }),
      ).rejects.toThrow(/mla/);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime resolves newly added module and concept records without manual runtime edits", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const sourcePath = join(
        getProjectRoot(),
        "src",
        "content",
        "registry",
        "modules",
        "attention.json",
      );
      const baseRecord = JSON.parse(
        await readFile(sourcePath, "utf8"),
      ) as Record<string, unknown>;
      const generatedRecord = {
        ...baseRecord,
        id: "module.runtime-generated-module",
        slug: "runtime-generated-module",
        aliases: ["runtime generated module"],
        tags: [],
        relatedIds: [],
        citationIds: [],
      };
      const generatedConcept = {
        id: "concept.runtime-generated-concept",
        slug: "runtime-generated-concept",
        kind: "concept",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: ["runtime generated concept"],
        tags: [],
        relatedIds: ["module.runtime-generated-module"],
        citationIds: [],
        status: "published",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
        conceptType: "architecture",
        prerequisiteIds: [],
        explainsIds: ["module.runtime-generated-module"],
      };

      await writeRegistryJson(
        registryRoot,
        "modules",
        "runtime-generated-module.json",
        generatedRecord,
      );
      await writeAttentionClassificationFixture(registryRoot);
      await writeRegistryJson(
        registryRoot,
        "concepts",
        "runtime-generated-concept.json",
        generatedConcept,
      );

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);

      expect(
        generatedRuntime.getModuleById("module.runtime-generated-module")?.slug,
      ).toBe("runtime-generated-module");
      expect(
        generatedRuntime.getConceptById("concept.runtime-generated-concept")
          ?.slug,
      ).toBe("runtime-generated-concept");
      expect(
        generatedRuntime.getRegistryRecordById(
          "module.runtime-generated-module",
        )?.kind,
      ).toBe("module");
      expect(
        generatedRuntime.getRegistryRecordById(
          "concept.runtime-generated-concept",
        )?.kind,
      ).toBe("concept");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime resolves a newly added classification without manual runtime edits", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeRegistryJson(
        registryRoot,
        "modules",
        "runtime-generated-activation.json",
        {
          id: "module.runtime-generated-activation",
          slug: "runtime-generated-activation",
          kind: "module",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: ["runtime generated activation"],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          moduleType: "activation",
          optimizes: [],
          exampleModelIds: [],
          improvesOnIds: [],
          tradeoffIds: [],
          usedByModelIds: [],
          introducedByPaperIds: [],
          mathLevel: "light",
          sortOrder: 5,
          primaryClassificationId: "classification.module.activation",
          secondaryClassificationIds: ["classification.module.feed-forward"],
          relationships: [
            {
              relationshipType: "uses",
              targetId: "citation.runtime-generated-activation-paper",
            },
          ],
        },
      );
      await writeRegistryJson(
        registryRoot,
        "classifications",
        "activation-functions.json",
        {
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
          sortOrder: 20,
          classificationType: "family",
          classifiesKinds: ["module"],
          parentClassificationId: "classification.module",
          legacyIds: ["classification.activation-functions"],
        },
      );
      await writeRegistryJson(
        registryRoot,
        "classifications",
        "feed-forward-blocks.json",
        {
          id: "classification.module.feed-forward",
          slug: "feed-forward-blocks",
          kind: "classification",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: ["feed-forward branch"],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          sortOrder: 10,
          classificationType: "family",
          classifiesKinds: ["module"],
          parentClassificationId: "classification.module",
          legacyIds: ["classification.feed-forward-blocks"],
        },
      );
      await writeRegistryJson(registryRoot, "classifications", "module.json", {
        id: "classification.module",
        slug: "module",
        kind: "classification",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
        classificationType: "domain",
        classifiesKinds: ["module"],
      });
      await writeRegistryJson(
        registryRoot,
        "citations",
        "runtime-generated-activation-paper.json",
        {
          id: "citation.runtime-generated-activation-paper",
          slug: "runtime-generated-activation-paper",
          kind: "citation",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: [],
          tags: [],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          citationType: "paper",
          authors: ["A. Author"],
          title: "Runtime Generated Activation Paper",
          url: "https://example.com/runtime-generated-activation-paper",
          mla: "Author. Runtime Generated Activation Paper.",
          year: 2026,
        },
      );

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);

      expect(
        generatedRuntime.getClassificationById(
          "classification.activation-functions",
        )?.id,
      ).toBe("classification.module.activation");
      expect(
        generatedRuntime.getParentClassificationById(
          "classification.activation-functions",
        )?.id,
      ).toBe("classification.module");
      expect(generatedRuntime.listLegacyClassificationBridges()).toEqual(
        expect.arrayContaining([
          {
            legacyId: "classification.activation-functions",
            canonicalId: "classification.module.activation",
          },
        ]),
      );
      expect(
        generatedRuntime
          .listChildClassifications("classification.module")
          .map((classification) => classification.id),
      ).toEqual(
        expect.arrayContaining([
          "classification.module.activation",
          "classification.module.feed-forward",
        ]),
      );
      expect(
        generatedRuntime.getPrimaryClassificationForRecord(
          "module.runtime-generated-activation",
        )?.id,
      ).toBe("classification.module.activation");
      expect(
        generatedRuntime.listSecondaryClassificationsForRecord(
          "module.runtime-generated-activation",
        ),
      ).toEqual([
        expect.objectContaining({
          id: "classification.module.feed-forward",
        }),
      ]);
      expect(
        generatedRuntime.listOntologyRelationshipsForRecord(
          "module.runtime-generated-activation",
        ),
      ).toEqual([
        expect.objectContaining({
          relationshipType: "uses",
          targetId: "citation.runtime-generated-activation-paper",
          target: expect.objectContaining({
            id: "citation.runtime-generated-activation-paper",
          }),
        }),
      ]);
      expect(
        generatedRuntime.listClassificationMembers(
          "classification.activation-functions",
        ),
      ).toEqual([
        expect.objectContaining({
          membershipType: "primary",
          record: expect.objectContaining({
            id: "module.runtime-generated-activation",
          }),
        }),
      ]);
      expect(
        generatedRuntime.listClassificationMembers(
          "classification.module.feed-forward",
        ),
      ).toEqual([]);
      expect(
        generatedRuntime.listClassificationMembers(
          "classification.feed-forward-blocks",
          { includeSecondary: true },
        ),
      ).toEqual([
        expect.objectContaining({
          membershipType: "secondary",
          record: expect.objectContaining({
            id: "module.runtime-generated-activation",
          }),
        }),
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime applies explicit sort order and surface filters to ownership lookups", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const timestamps = {
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      };
      const baseFields = {
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published",
        ...timestamps,
      };

      await writeRegistryJson(registryRoot, "classifications", "module.json", {
        ...baseFields,
        id: "classification.module",
        slug: "module",
        kind: "classification",
        classificationType: "domain",
        classifiesKinds: ["module"],
      });
      await writeRegistryJson(registryRoot, "classifications", "concept.json", {
        ...baseFields,
        id: "classification.concept",
        slug: "concept",
        kind: "classification",
        classificationType: "domain",
        classifiesKinds: ["concept"],
      });
      await writeRegistryJson(registryRoot, "classifications", "zeta.json", {
        ...baseFields,
        id: "classification.module.runtime-zeta",
        slug: "runtime-zeta",
        kind: "classification",
        classificationType: "family",
        classifiesKinds: ["module"],
        parentClassificationId: "classification.module",
      });
      await writeRegistryJson(registryRoot, "classifications", "alpha.json", {
        ...baseFields,
        id: "classification.module.runtime-alpha",
        slug: "runtime-alpha",
        kind: "classification",
        classificationType: "family",
        classifiesKinds: ["module"],
        sortOrder: 1,
        parentClassificationId: "classification.module",
      });
      await writeRegistryJson(registryRoot, "classifications", "draft.json", {
        ...baseFields,
        id: "classification.module.runtime-draft",
        slug: "runtime-draft",
        kind: "classification",
        status: "draft",
        classificationType: "family",
        classifiesKinds: ["module"],
        parentClassificationId: "classification.module",
      });
      await writeRegistryJson(
        registryRoot,
        "classifications",
        "paper-only.json",
        {
          ...baseFields,
          id: "classification.concept.runtime-paper-only",
          slug: "runtime-paper-only",
          kind: "classification",
          classificationType: "family",
          classifiesKinds: ["concept"],
          parentClassificationId: "classification.concept",
        },
      );

      await writeRegistryJson(registryRoot, "modules", "beta.json", {
        ...baseFields,
        id: "module.runtime-beta",
        slug: "runtime-beta",
        kind: "module",
        moduleType: "other",
        optimizes: [],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        sortOrder: 2,
        primaryClassificationId: "classification.module.runtime-zeta",
        secondaryClassificationIds: [
          "classification.module.runtime-alpha",
          "classification.module.runtime-draft",
        ],
      });
      await writeRegistryJson(registryRoot, "modules", "alpha.json", {
        ...baseFields,
        id: "module.runtime-alpha",
        slug: "runtime-alpha",
        kind: "module",
        moduleType: "other",
        optimizes: [],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        sortOrder: 1,
        primaryClassificationId: "classification.module.runtime-zeta",
      });
      await writeRegistryJson(registryRoot, "concepts", "paper-owned.json", {
        ...baseFields,
        id: "concept.runtime-paper-owned",
        slug: "runtime-paper-owned",
        kind: "concept",
        conceptType: "architecture",
        prerequisiteIds: [],
        explainsIds: [],
        relatedModuleIds: [],
        primaryClassificationId: "classification.concept.runtime-paper-only",
      });

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);

      expect(
        generatedRuntime.listClassificationRoots().map((record) => record.id),
      ).toEqual(["classification.concept", "classification.module"]);
      expect(
        generatedRuntime
          .listClassificationMembers("classification.module.runtime-zeta")
          .map((member) => member.record.id),
      ).toEqual(["module.runtime-alpha", "module.runtime-beta"]);
      expect(
        generatedRuntime
          .listClassificationMembers("classification.module.runtime-alpha")
          .map((member) => member.record.id),
      ).toEqual([]);
      expect(
        generatedRuntime
          .listClassificationMembers("classification.module.runtime-alpha", {
            includeSecondary: true,
          })
          .map((member) => member.record.id),
      ).toEqual(["module.runtime-beta"]);
      expect(
        generatedRuntime.getPrimaryClassificationForRecord(
          "module.runtime-beta",
          {
            statuses: ["published"],
            classifiesKinds: ["module"],
          },
        )?.id,
      ).toBe("classification.module.runtime-zeta");
      expect(
        generatedRuntime.getPrimaryClassificationForRecord(
          "concept.runtime-paper-owned",
          {
            statuses: ["published"],
            classifiesKinds: ["module"],
          },
        ),
      ).toBeUndefined();
      expect(
        generatedRuntime.listSecondaryClassificationsForRecord(
          "module.runtime-beta",
          { statuses: ["published"], classifiesKinds: ["module"] },
        ),
      ).toEqual([
        expect.objectContaining({ id: "classification.module.runtime-alpha" }),
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime lookup and list helpers cover representative record kinds", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const timestamps = {
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      };
      const baseFields = {
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published",
        ...timestamps,
      };

      await writeRegistryJson(
        registryRoot,
        "classifications",
        "runtime-family.json",
        {
          ...baseFields,
          id: "classification.model",
          slug: "model",
          kind: "classification",
          classificationType: "domain",
          classifiesKinds: ["model"],
        },
      );
      await writeRegistryJson(registryRoot, "models", "runtime-model.json", {
        ...baseFields,
        id: "model.runtime-model",
        slug: "runtime-model",
        kind: "model",
        family: "Runtime Model",
        sourceType: "research",
        modalities: ["text"],
        architectureIds: [],
        moduleIds: [],
        trainingRegimeIds: [],
        datasetIds: [],
        paperIds: [],
      });
      await writeRegistryJson(registryRoot, "papers", "runtime-paper.json", {
        ...baseFields,
        id: "paper.runtime-paper",
        slug: "runtime-paper",
        kind: "paper",
        authors: ["Runtime Author"],
        publishedAt: "2026-06-01",
        url: "https://example.com/runtime-paper",
        introducesIds: [],
        supportsIds: [],
        arguesAgainstIds: [],
        modelIds: ["model.runtime-model"],
        moduleIds: [],
        conceptIds: [],
      });
      await writeRegistryJson(
        registryRoot,
        "training-regimes",
        "runtime-training.json",
        {
          ...baseFields,
          id: "training-regime.runtime-training",
          slug: "runtime-training",
          kind: "training-regime",
          regimeType: "pretraining",
          usedByModelIds: ["model.runtime-model"],
          relatedModuleIds: [],
          paperIds: ["paper.runtime-paper"],
        },
      );
      await writeRegistryJson(registryRoot, "systems", "runtime-system.json", {
        ...baseFields,
        id: "system.runtime-system",
        slug: "runtime-system",
        kind: "system",
        systemType: "serving",
        relatedModelIds: ["model.runtime-model"],
        relatedModuleIds: [],
        relatedConceptIds: [],
        paperIds: ["paper.runtime-paper"],
        datasetIds: [],
      });
      await writeRegistryJson(
        registryRoot,
        "datasets",
        "runtime-dataset.json",
        {
          ...baseFields,
          id: "dataset.runtime-dataset",
          slug: "runtime-dataset",
          kind: "dataset",
          usedByModelIds: ["model.runtime-model"],
          paperIds: ["paper.runtime-paper"],
        },
      );
      await writeRegistryJson(
        registryRoot,
        "organizations",
        "runtime-organization.json",
        {
          ...baseFields,
          id: "organization.runtime-organization",
          slug: "runtime-organization",
          kind: "organization",
          website: "https://example.com/runtime-organization",
          modelIds: ["model.runtime-model"],
          paperIds: ["paper.runtime-paper"],
          systemIds: ["system.runtime-system"],
        },
      );
      await writeRegistryJson(
        registryRoot,
        "citations",
        "runtime-citation.json",
        {
          ...baseFields,
          id: "citation.runtime-citation",
          slug: "runtime-citation",
          kind: "citation",
          citationType: "paper",
          authors: ["Runtime Author"],
          title: "Runtime Citation",
          url: "https://example.com/runtime-citation",
          mla: "Runtime Author. Runtime Citation.",
          year: 2026,
        },
      );

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);

      expect(generatedRuntime.getModelById("model.runtime-model")?.kind).toBe(
        "model",
      );
      expect(generatedRuntime.getPaperById("paper.runtime-paper")?.kind).toBe(
        "paper",
      );
      expect(
        generatedRuntime.getTrainingRegimeById(
          "training-regime.runtime-training",
        )?.kind,
      ).toBe("training-regime");
      expect(
        generatedRuntime.getSystemById("system.runtime-system")?.kind,
      ).toBe("system");
      expect(
        generatedRuntime.getDatasetById("dataset.runtime-dataset")?.kind,
      ).toBe("dataset");
      expect(
        generatedRuntime.getOrganizationById(
          "organization.runtime-organization",
        )?.kind,
      ).toBe("organization");
      expect(
        generatedRuntime.getClassificationById("classification.model")?.kind,
      ).toBe("classification");
      expect(
        generatedRuntime.getCitationById("citation.runtime-citation")?.kind,
      ).toBe("citation");

      expect(
        generatedRuntime.listModelRecords().map((record) => record.id),
      ).toEqual(["model.runtime-model"]);
      expect(
        generatedRuntime.listPaperRecords().map((record) => record.id),
      ).toEqual(["paper.runtime-paper"]);
      expect(
        generatedRuntime.listTrainingRegimeRecords().map((record) => record.id),
      ).toEqual(["training-regime.runtime-training"]);
      expect(
        generatedRuntime.listSystemRecords().map((record) => record.id),
      ).toEqual(["system.runtime-system"]);
      expect(
        generatedRuntime.listDatasetRecords().map((record) => record.id),
      ).toEqual(["dataset.runtime-dataset"]);
      expect(
        generatedRuntime.listOrganizationRecords().map((record) => record.id),
      ).toEqual(["organization.runtime-organization"]);
      expect(
        generatedRuntime.listClassificationRecords().map((record) => record.id),
      ).toEqual(["classification.model"]);
      expect(
        generatedRuntime.listCitationRecords().map((record) => record.id),
      ).toEqual(["citation.runtime-citation"]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime classification traversal includes roots, descendants, and inherited members", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const baseFields = {
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published" as const,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      };

      await writeRegistryJson(registryRoot, "classifications", "root.json", {
        ...baseFields,
        id: "classification.module",
        slug: "runtime-root",
        kind: "classification",
        classificationType: "domain",
        classifiesKinds: ["module"],
      });
      await writeRegistryJson(registryRoot, "classifications", "branch.json", {
        ...baseFields,
        id: "classification.module.runtime-branch",
        slug: "runtime-branch",
        kind: "classification",
        classificationType: "family",
        classifiesKinds: ["module"],
        parentClassificationId: "classification.module",
      });
      await writeRegistryJson(registryRoot, "classifications", "leaf.json", {
        ...baseFields,
        id: "classification.module.runtime-branch.runtime-leaf",
        slug: "runtime-leaf",
        kind: "classification",
        classificationType: "mechanism",
        classifiesKinds: ["module"],
        parentClassificationId: "classification.module.runtime-branch",
      });
      await writeRegistryJson(registryRoot, "modules", "branch-module.json", {
        ...baseFields,
        id: "module.runtime-branch-module",
        slug: "runtime-branch-module",
        kind: "module",
        moduleType: "other",
        optimizes: [],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        primaryClassificationId: "classification.module.runtime-branch",
      });
      await writeRegistryJson(registryRoot, "modules", "leaf-module.json", {
        ...baseFields,
        id: "module.runtime-leaf-module",
        slug: "runtime-leaf-module",
        kind: "module",
        moduleType: "other",
        optimizes: [],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        primaryClassificationId:
          "classification.module.runtime-branch.runtime-leaf",
      });

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);

      expect(
        generatedRuntime.listClassificationRoots().map((record) => record.id),
      ).toEqual(["classification.module"]);
      expect(
        generatedRuntime
          .listClassificationChildren("classification.module")
          .map((record) => record.id),
      ).toEqual(["classification.module.runtime-branch"]);
      expect(
        generatedRuntime
          .listClassificationAncestors(
            "classification.module.runtime-branch.runtime-leaf",
          )
          .map((record) => record.id),
      ).toEqual([
        "classification.module.runtime-branch",
        "classification.module",
      ]);
      expect(
        generatedRuntime
          .listClassificationDescendants("classification.module")
          .map((record) => record.id),
      ).toEqual([
        "classification.module.runtime-branch",
        "classification.module.runtime-branch.runtime-leaf",
      ]);
      expect(
        generatedRuntime
          .listClassificationMembers("classification.module")
          .map((member) => member.record.id),
      ).toEqual([]);
      expect(
        generatedRuntime
          .listClassificationMembers("classification.module", {
            includeDescendants: true,
          })
          .map(
            (member) =>
              `${member.classificationId}:${member.isInherited}:${member.record.id}`,
          ),
      ).toEqual([
        "classification.module.runtime-branch:true:module.runtime-branch-module",
        "classification.module.runtime-branch.runtime-leaf:true:module.runtime-leaf-module",
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime builds a renderable classification tree with explicit empty-branch handling", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const baseFields = {
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published" as const,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      };

      await writeRegistryJson(registryRoot, "classifications", "root.json", {
        ...baseFields,
        id: "classification.module",
        slug: "runtime-root",
        kind: "classification",
        classificationType: "domain",
        classifiesKinds: ["module"],
      });
      await writeRegistryJson(
        registryRoot,
        "classifications",
        "position-encodings.json",
        {
          ...baseFields,
          id: "classification.module.runtime-position-encodings",
          slug: "runtime-position-encodings",
          kind: "classification",
          classificationType: "family",
          classifiesKinds: ["module"],
          sortOrder: 1,
          parentClassificationId: "classification.module",
        },
      );
      await writeRegistryJson(
        registryRoot,
        "classifications",
        "attention-mechanisms.json",
        {
          ...baseFields,
          id: "classification.module.runtime-attention-mechanisms",
          slug: "runtime-attention-mechanisms",
          kind: "classification",
          classificationType: "family",
          classifiesKinds: ["module"],
          sortOrder: 2,
          parentClassificationId: "classification.module",
        },
      );
      await writeRegistryJson(
        registryRoot,
        "classifications",
        "empty-modules.json",
        {
          ...baseFields,
          id: "classification.module.runtime-empty-modules",
          slug: "runtime-empty-modules",
          kind: "classification",
          classificationType: "family",
          classifiesKinds: ["module"],
          sortOrder: 3,
          parentClassificationId: "classification.module",
        },
      );
      await writeRegistryJson(registryRoot, "modules", "rope.json", {
        ...baseFields,
        id: "module.runtime-rope",
        slug: "runtime-rope",
        kind: "module",
        moduleType: "position-encoding",
        optimizes: [],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        sortOrder: 2,
        primaryClassificationId:
          "classification.module.runtime-position-encodings",
      });
      await writeRegistryJson(registryRoot, "modules", "alibi.json", {
        ...baseFields,
        id: "module.runtime-alibi",
        slug: "runtime-alibi",
        kind: "module",
        moduleType: "position-encoding",
        optimizes: [],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        sortOrder: 1,
        primaryClassificationId:
          "classification.module.runtime-position-encodings",
      });
      await writeRegistryJson(registryRoot, "modules", "causal.json", {
        ...baseFields,
        id: "module.runtime-causal",
        slug: "runtime-causal",
        kind: "module",
        moduleType: "attention",
        optimizes: [],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        primaryClassificationId:
          "classification.module.runtime-attention-mechanisms",
      });

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);
      const tree = generatedRuntime.buildClassificationTree({
        rootClassificationIds: ["classification.module"],
      });

      expect(
        tree.map((node) => ({
          id: node.classification.id,
          directMemberCount: node.directMemberCount,
          totalMemberCount: node.totalMemberCount,
          children: node.children.map((child) =>
            child.nodeType === "classification"
              ? `classification:${child.classification.id}`
              : `record:${child.member.record.id}`,
          ),
        })),
      ).toEqual([
        {
          id: "classification.module",
          directMemberCount: 0,
          totalMemberCount: 3,
          children: [
            "classification:classification.module.runtime-position-encodings",
            "classification:classification.module.runtime-attention-mechanisms",
          ],
        },
      ]);
      expect(
        tree[0]?.classificationChildren.map((child) => child.classification.id),
      ).toEqual([
        "classification.module.runtime-position-encodings",
        "classification.module.runtime-attention-mechanisms",
      ]);
      expect(
        tree[0]?.classificationChildren[0]?.recordChildren.map(
          (child) => child.member.record.id,
        ),
      ).toEqual(["module.runtime-alibi", "module.runtime-rope"]);
      expect(
        generatedRuntime
          .buildClassificationTree({
            rootClassificationIds: ["classification.module"],
            memberKinds: ["module"],
          })[0]
          ?.children.map((child) =>
            child.nodeType === "classification"
              ? child.classification.id
              : child.member.record.id,
          ),
      ).toEqual([
        "classification.module.runtime-position-encodings",
        "classification.module.runtime-attention-mechanisms",
      ]);
      expect(
        generatedRuntime
          .buildClassificationTree({
            rootClassificationIds: ["classification.module"],
            includeEmptyClassifications: true,
          })[0]
          ?.classificationChildren.map((child) => child.classification.id),
      ).toEqual([
        "classification.module.runtime-position-encodings",
        "classification.module.runtime-attention-mechanisms",
        "classification.module.runtime-empty-modules",
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime helpers return undefined and empty arrays for missing records", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = await importGeneratedRuntime(outputPath);

      expect(generatedRuntime.getModuleById("module.missing")).toBeUndefined();
      expect(
        generatedRuntime.getConceptById("concept.missing"),
      ).toBeUndefined();
      expect(generatedRuntime.getModelById("model.missing")).toBeUndefined();
      expect(generatedRuntime.getPaperById("paper.missing")).toBeUndefined();
      expect(
        generatedRuntime.getTrainingRegimeById("training-regime.missing"),
      ).toBeUndefined();
      expect(generatedRuntime.getSystemById("system.missing")).toBeUndefined();
      expect(
        generatedRuntime.getDatasetById("dataset.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.getOrganizationById("organization.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.getClassificationById("classification.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.getParentClassificationById("classification.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.getCitationById("citation.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.getRegistryRecordById("module.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.getRegistryTags("module.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.getRegistryCitationIds("module.missing"),
      ).toBeUndefined();
      expect(
        generatedRuntime.listSecondaryClassificationsForRecord(
          "module.missing",
        ),
      ).toEqual([]);
      expect(
        generatedRuntime.listOntologyRelationshipsForRecord("module.missing"),
      ).toEqual([]);
      expect(
        generatedRuntime.listClassificationMembers("classification.missing"),
      ).toEqual([]);
      expect(
        generatedRuntime.listChildClassifications("classification.missing"),
      ).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime source orders discovered files deterministically", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const sourcePath = join(
        getProjectRoot(),
        "src",
        "content",
        "registry",
        "modules",
        "attention.json",
      );
      const baseRecord = JSON.parse(
        await readFile(sourcePath, "utf8"),
      ) as Record<string, unknown>;
      await writeAttentionClassificationFixture(registryRoot);

      await writeFile(
        join(registryRoot, "modules", "zeta.json"),
        JSON.stringify({
          ...baseRecord,
          id: "module.zeta",
          slug: "zeta",
          tags: [],
          relatedIds: [],
          citationIds: [],
        }),
      );
      await writeFile(
        join(registryRoot, "modules", "alpha.json"),
        JSON.stringify({
          ...baseRecord,
          id: "module.alpha",
          slug: "alpha",
          tags: [],
          relatedIds: [],
          citationIds: [],
        }),
      );

      const source = await generateRegistryRuntimeSource({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      expect(source.indexOf("alpha.json")).toBeLessThan(
        source.indexOf("zeta.json"),
      );
      expect(source.indexOf('id: "module.alpha"')).toBe(-1);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generation fails with duplicate registry ids named in the error", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const sourcePath = join(
        getProjectRoot(),
        "src",
        "content",
        "registry",
        "modules",
        "attention.json",
      );
      const baseRecord = JSON.parse(
        await readFile(sourcePath, "utf8"),
      ) as Record<string, unknown>;

      await writeFile(
        join(registryRoot, "modules", "duplicate-a.json"),
        JSON.stringify({
          ...baseRecord,
          id: "module.duplicate-runtime-id",
          slug: "duplicate-runtime-a",
        }),
      );
      await writeFile(
        join(registryRoot, "modules", "duplicate-b.json"),
        JSON.stringify({
          ...baseRecord,
          id: "module.duplicate-runtime-id",
          slug: "duplicate-runtime-b",
        }),
      );

      await expect(
        generateRegistryRuntimeSource({
          outputPath,
          projectRoot: getProjectRoot(),
          registryRoot,
        }),
      ).rejects.toThrow(
        /duplicate registry id "module\.duplicate-runtime-id"[\s\S]*duplicate-a\.json[\s\S]*duplicate-b\.json/,
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generation fails with duplicate registry slugs named in the error", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      const sourcePath = join(
        getProjectRoot(),
        "src",
        "content",
        "registry",
        "modules",
        "attention.json",
      );
      const baseRecord = JSON.parse(
        await readFile(sourcePath, "utf8"),
      ) as Record<string, unknown>;

      await writeRegistryJson(registryRoot, "modules", "duplicate-a.json", {
        ...baseRecord,
        id: "module.duplicate-runtime-slug-a",
        slug: "duplicate-runtime-slug",
      });
      await writeRegistryJson(registryRoot, "modules", "duplicate-b.json", {
        ...baseRecord,
        id: "module.duplicate-runtime-slug-b",
        slug: "duplicate-runtime-slug",
      });

      await expect(
        generateRegistryRuntimeSource({
          outputPath,
          projectRoot: getProjectRoot(),
          registryRoot,
        }),
      ).rejects.toThrow(
        /duplicate registry slug "duplicate-runtime-slug"[\s\S]*duplicate-a\.json[\s\S]*duplicate-b\.json/,
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generation fails with invalid registry file paths and schema details", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeFile(
        join(registryRoot, "modules", "invalid-module.json"),
        JSON.stringify({
          id: "module.invalid-runtime-record",
          slug: "invalid-runtime-record",
          kind: "module",
          defaultTitleKey: "title",
        }),
      );

      await expect(
        generateRegistryRuntimeSource({
          outputPath,
          projectRoot: getProjectRoot(),
          registryRoot,
        }),
      ).rejects.toThrow(
        /invalid-module\.json:[\s\S]*defaultSummaryKey: Required[\s\S]*mathLevel: Required/,
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
