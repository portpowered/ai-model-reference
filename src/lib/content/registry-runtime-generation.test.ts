import { describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  const tempRoot = join(
    import.meta.dir,
    "__registry-runtime-generation-fixtures__",
    crypto.randomUUID(),
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

describe("registry-runtime generation", () => {
  test("generated runtime resolves a newly added module without manual runtime edits", async () => {
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
      };

      await writeFile(
        join(registryRoot, "modules", "runtime-generated-module.json"),
        JSON.stringify(generatedRecord),
      );

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = (await import(
        `${pathToFileURL(outputPath).href}?t=${Date.now()}`
      )) as typeof import("./registry-runtime");

      expect(
        generatedRuntime.getModuleById("module.runtime-generated-module")?.slug,
      ).toBe("runtime-generated-module");
      expect(
        generatedRuntime.getRegistryRecordById(
          "module.runtime-generated-module",
        )?.kind,
      ).toBe("module");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generated runtime resolves a newly added classification without manual runtime edits", async () => {
    const { outputPath, registryRoot, tempRoot } =
      await createTempRegistryRoot();
    try {
      await writeFile(
        join(registryRoot, "modules", "runtime-generated-activation.json"),
        JSON.stringify({
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
        }),
      );
      await writeFile(
        join(registryRoot, "classifications", "activation-functions.json"),
        JSON.stringify({
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
        }),
      );
      await writeFile(
        join(registryRoot, "classifications", "feed-forward-blocks.json"),
        JSON.stringify({
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
        }),
      );
      await writeFile(
        join(
          registryRoot,
          "citations",
          "runtime-generated-activation-paper.json",
        ),
        JSON.stringify({
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
        }),
      );

      await writeGeneratedRegistryRuntimeModule({
        outputPath,
        projectRoot: getProjectRoot(),
        registryRoot,
      });

      const generatedRuntime = (await import(
        `${pathToFileURL(outputPath).href}?t=${Date.now()}`
      )) as typeof import("./registry-runtime");

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

      await writeFile(
        join(registryRoot, "modules", "zeta.json"),
        JSON.stringify({
          ...baseRecord,
          id: "module.zeta",
          slug: "zeta",
        }),
      );
      await writeFile(
        join(registryRoot, "modules", "alpha.json"),
        JSON.stringify({
          ...baseRecord,
          id: "module.alpha",
          slug: "alpha",
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
        /invalid-module\.json:[\s\S]*defaultSummaryKey: Required[\s\S]*moduleType: Required/,
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
