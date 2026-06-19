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
