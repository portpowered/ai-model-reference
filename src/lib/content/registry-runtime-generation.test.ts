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
  await writeRegistryJson(
    registryRoot,
    "classifications",
    "attention-mechanisms.json",
    {
      id: "classification.attention-mechanisms",
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
          primaryClassificationId: "classification.activation-functions",
          secondaryClassificationIds: ["classification.feed-forward-blocks"],
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
          id: "classification.activation-functions",
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
          classifiesKinds: ["module", "concept"],
        },
      );
      await writeRegistryJson(
        registryRoot,
        "classifications",
        "feed-forward-blocks.json",
        {
          id: "classification.feed-forward-blocks",
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
          classificationType: "topology",
          classifiesKinds: ["module"],
        },
      );
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
        )?.slug,
      ).toBe("activation-functions");
      expect(
        generatedRuntime.getPrimaryClassificationForRecord(
          "module.runtime-generated-activation",
        )?.id,
      ).toBe("classification.activation-functions");
      expect(
        generatedRuntime.listSecondaryClassificationsForRecord(
          "module.runtime-generated-activation",
        ),
      ).toEqual([
        expect.objectContaining({
          id: "classification.feed-forward-blocks",
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
          "classification.feed-forward-blocks",
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
          id: "classification.runtime-family",
          slug: "runtime-family",
          kind: "classification",
          classificationType: "family",
          classifiesKinds: ["model", "module", "concept", "paper"],
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
        generatedRuntime.getClassificationById("classification.runtime-family")
          ?.kind,
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
      ).toEqual(["classification.runtime-family"]);
      expect(
        generatedRuntime.listCitationRecords().map((record) => record.id),
      ).toEqual(["citation.runtime-citation"]);
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
