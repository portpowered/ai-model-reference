import { describe, expect, test } from "bun:test";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "./content-paths";
import { GeneratePageBundleError } from "./generate-page-bundle";
import {
  classifyGeneratePageBundleFailure,
  formatGeneratePageBundleUsage,
  GeneratePageBundleCliError,
  parseGeneratePageBundleArgv,
  runGeneratePageBundleCli,
} from "./generate-page-bundle-cli";
import { PageSpecValidationError } from "./page-spec";
import { loadRegistry } from "./registry";
import {
  validateGeneratedPageBundle,
  validateGeneratedPageBundleRegistryContent,
} from "./validate-generated-page-bundle";

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createFixtureRoot(): Promise<string> {
  const tempRoot = join(
    import.meta.dir,
    "__cli-fixtures__",
    crypto.randomUUID(),
  );
  const { cp } = await import("node:fs/promises");
  await mkdir(join(tempRoot, "docs", "templates"), { recursive: true });
  await cp(
    join(getProjectRoot(), "docs", "templates"),
    join(tempRoot, "docs", "templates"),
    { recursive: true },
  );
  await mkdir(join(tempRoot, "src", "content", "registry", "concepts"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "classifications"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "citations"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "modules"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "models"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "papers"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "graphs"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "tables"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "tags"), {
    recursive: true,
  });
  await mkdir(
    join(tempRoot, "src", "content", "registry", "training-regimes"),
    {
      recursive: true,
    },
  );
  await mkdir(join(tempRoot, "src", "content", "docs", "concepts"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "docs", "glossary"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "docs", "modules"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "docs", "models"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "docs", "papers"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "docs", "training"), {
    recursive: true,
  });
  return tempRoot;
}

async function copyRegistryFixture(
  tempRoot: string,
  input: {
    kindDirectory: string;
    slug: string;
  },
): Promise<void> {
  const sourcePath = join(
    getProjectRoot(),
    "src",
    "content",
    "registry",
    input.kindDirectory,
    `${input.slug}.json`,
  );
  await writeFile(
    join(
      tempRoot,
      "src",
      "content",
      "registry",
      input.kindDirectory,
      `${input.slug}.json`,
    ),
    await readFile(sourcePath, "utf8"),
  );
}

async function writeReferenceModuleFixture(
  tempRoot: string,
  input: { slug: string; aliases?: string[] },
): Promise<void> {
  await writeFile(
    join(
      tempRoot,
      "src",
      "content",
      "registry",
      "modules",
      `${input.slug}.json`,
    ),
    JSON.stringify({
      id: `module.${input.slug}`,
      slug: input.slug,
      kind: "module",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: input.aliases ?? [],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "draft",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      primaryClassificationId: "classification.module.attention",
      moduleType: "attention",
      optimizes: [],
      exampleModelIds: [],
      improvesOnIds: [],
      tradeoffIds: [],
      usedByModelIds: [],
      introducedByPaperIds: [],
      mathLevel: "none",
    }),
  );
}

async function writeClassificationFixture(
  tempRoot: string,
  input: {
    id: string;
    slug: string;
    classificationType:
      | "domain"
      | "family"
      | "mechanism"
      | "topology"
      | "behavior";
    classifiesKinds: string[];
    legacyIds?: string[];
    parentClassificationId?: string;
  },
): Promise<void> {
  await writeFile(
    join(
      tempRoot,
      "src",
      "content",
      "registry",
      "classifications",
      `${input.slug}.json`,
    ),
    JSON.stringify({
      id: input.id,
      slug: input.slug,
      kind: "classification",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: [],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "draft",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      classificationType: input.classificationType,
      classifiesKinds: input.classifiesKinds,
      ...(input.legacyIds?.length ? { legacyIds: input.legacyIds } : {}),
      ...(input.parentClassificationId
        ? { parentClassificationId: input.parentClassificationId }
        : {}),
    }),
  );
}

async function seedExpandedKindValidationFixtures(
  tempRoot: string,
): Promise<void> {
  await writeFile(
    join(
      tempRoot,
      "src",
      "content",
      "registry",
      "classifications",
      "module.json",
    ),
    JSON.stringify({
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
    }),
  );
  await writeFile(
    join(
      tempRoot,
      "src",
      "content",
      "registry",
      "classifications",
      "attention-mechanisms.json",
    ),
    JSON.stringify({
      id: "classification.module.attention",
      slug: "attention-mechanisms",
      kind: "classification",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: ["attention family"],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      classificationType: "family",
      classifiesKinds: ["module"],
      parentClassificationId: "classification.module",
    }),
  );
  await copyRegistryFixture(tempRoot, {
    kindDirectory: "tags",
    slug: "attention",
  });
  await copyRegistryFixture(tempRoot, {
    kindDirectory: "tags",
    slug: "foundations",
  });
  await copyRegistryFixture(tempRoot, {
    kindDirectory: "tags",
    slug: "model-family",
  });
  await copyRegistryFixture(tempRoot, {
    kindDirectory: "citations",
    slug: "attention-is-all-you-need",
  });
  await writeClassificationFixture(tempRoot, {
    id: "classification.module.attention.kv-cache-optimizations",
    slug: "kv-cache-optimizations",
    classificationType: "behavior",
    classifiesKinds: ["module"],
    parentClassificationId: "classification.module.attention",
  });
  await writeClassificationFixture(tempRoot, {
    id: "classification.training",
    slug: "training",
    classificationType: "domain",
    classifiesKinds: ["training-regime"],
  });
  await writeClassificationFixture(tempRoot, {
    id: "classification.training.alignment",
    slug: "training-alignment",
    classificationType: "family",
    classifiesKinds: ["training-regime"],
    parentClassificationId: "classification.training",
  });
  await writeReferenceModuleFixture(tempRoot, {
    slug: "multi-head-attention",
    aliases: ["MHA"],
  });
  await writeReferenceModuleFixture(tempRoot, {
    slug: "attention",
  });
  await writeReferenceModuleFixture(tempRoot, {
    slug: "multi-query-attention",
    aliases: ["MQA"],
  });
  await writeReferenceModuleFixture(tempRoot, {
    slug: "next-token-prediction",
  });
  await writeFile(
    join(
      tempRoot,
      "src",
      "content",
      "registry",
      "tables",
      "module-page-spec-workflow-sample-comparison.json",
    ),
    JSON.stringify({
      id: "table.module-page-spec-workflow-sample-comparison",
      subjectId: "module.module-page-spec-workflow-sample",
      columns: [
        {
          moduleId: "module.module-page-spec-workflow-sample",
          titleKey: "tables.comparison.columns.generated.title",
        },
        {
          moduleId: "module.multi-head-attention",
          titleKey: "tables.comparison.columns.mha.title",
        },
        {
          moduleId: "module.multi-query-attention",
          titleKey: "tables.comparison.columns.mqa.title",
        },
      ],
      dimensions: [
        {
          id: "cacheFootprint",
          labelKey: "tables.comparison.dimensions.cacheFootprint",
        },
      ],
      valueKeysByModuleId: {
        "module.module-page-spec-workflow-sample": {
          cacheFootprint: "tables.comparison.values.generated.cacheFootprint",
        },
        "module.multi-head-attention": {
          cacheFootprint: "tables.comparison.values.mha.cacheFootprint",
        },
        "module.multi-query-attention": {
          cacheFootprint: "tables.comparison.values.mqa.cacheFootprint",
        },
      },
    }),
  );
}

async function seedExpandedKindCompatibilityFixtures(
  tempRoot: string,
): Promise<void> {
  await seedExpandedKindValidationFixtures(tempRoot);
  await writeClassificationFixture(tempRoot, {
    id: "classification.module.attention",
    slug: "attention-mechanisms",
    classificationType: "family",
    classifiesKinds: ["module"],
    legacyIds: ["classification.attention-mechanisms"],
    parentClassificationId: "classification.module",
  });
  await writeClassificationFixture(tempRoot, {
    id: "classification.module.attention.kv-cache-optimizations",
    slug: "kv-cache-optimizations",
    classificationType: "behavior",
    classifiesKinds: ["module"],
    legacyIds: ["classification.kv-cache-optimizations"],
    parentClassificationId: "classification.module.attention",
  });
}

describe("parseGeneratePageBundleArgv", () => {
  test("parses required and optional flags", () => {
    expect(
      parseGeneratePageBundleArgv(["--spec", "page-spec.json", "--dry-run"]),
    ).toEqual({
      specPath: "page-spec.json",
      dryRun: true,
    });
  });

  test("throws usage error when --spec is missing", () => {
    expect(() => parseGeneratePageBundleArgv(["--dry-run"])).toThrow(
      GeneratePageBundleCliError,
    );
  });
});

describe("classifyGeneratePageBundleFailure", () => {
  test("labels invalid page spec input", () => {
    const failure = classifyGeneratePageBundleFailure(
      new PageSpecValidationError([{ field: "slug", message: "Required" }]),
    );
    expect(failure.category).toBe("invalid-input");
    expect(failure.message).toContain("Invalid page spec input:");
    expect(failure.message).toContain("slug: Required");
  });

  test("labels existing target files", () => {
    const failure = classifyGeneratePageBundleFailure(
      new GeneratePageBundleError(
        "Refusing to overwrite existing path: /tmp/page.mdx",
      ),
    );
    expect(failure.category).toBe("existing-target");
    expect(failure.message).toContain("Existing target file:");
  });

  test("labels unresolved references", () => {
    const failure = classifyGeneratePageBundleFailure(
      new GeneratePageBundleError(
        "Unresolved reference: assets.conceptMap.altKey is missing",
      ),
    );
    expect(failure.category).toBe("unresolved-reference");
  });

  test("labels missing template files", () => {
    const error = new Error("ENOENT") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    error.path = "/tmp/docs/templates/concept.mdx";
    const failure = classifyGeneratePageBundleFailure(error);
    expect(failure.category).toBe("missing-template");
    expect(failure.message).toContain("/tmp/docs/templates/concept.mdx");
  });
});

describe("runGeneratePageBundleCli", () => {
  test("dry-run prints planned registry id, route, and paths without writing files", async () => {
    const tempRoot = await createFixtureRoot();
    const slug = `cli-dry-run-${crypto.randomUUID()}`;
    const specPath = join(tempRoot, "page-spec.json");

    try {
      await writeFile(
        specPath,
        JSON.stringify({
          kind: "concept",
          slug,
          title: "CLI Dry Run Concept",
          summary: "Summary for dry-run review.",
          conceptType: "general",
        }),
      );

      const result = await runGeneratePageBundleCli({
        specPath,
        dryRun: true,
        projectRoot: tempRoot,
      });

      expect(result.dryRun).toBe(true);
      expect(result.plan).toContain(`Registry id: concept.${slug}`);
      expect(result.plan).toContain(`/docs/concepts/${slug}`);
      expect(result.plan).toContain("Planned files:");

      for (const line of result.plan.split("\n")) {
        if (!line.trim().startsWith("- ")) {
          continue;
        }
        const path = line.replace(/^\s*-\s+/, "").replace(/\s+\([^)]+\)$/, "");
        expect(await pathExists(path)).toBe(false);
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("dry-run supports module, model, paper, and training-regime page specs", async () => {
    const tempRoot = await createFixtureRoot();
    const cases = [
      {
        spec: {
          kind: "module",
          slug: `cli-module-${crypto.randomUUID()}`,
          title: "CLI Module Dry Run",
          summary: "Summary for module dry-run review.",
          moduleType: "attention",
        },
        registryId: (slug: string) => `module.${slug}`,
        route: (slug: string) => `/docs/modules/${slug}`,
      },
      {
        spec: {
          kind: "model",
          slug: `cli-model-${crypto.randomUUID()}`,
          title: "CLI Model Dry Run",
          summary: "Summary for model dry-run review.",
          family: "gpt",
          sourceType: "open-weights",
          modalities: ["text"],
        },
        registryId: (slug: string) => `model.${slug}`,
        route: (slug: string) => `/docs/models/${slug}`,
      },
      {
        spec: {
          kind: "paper",
          slug: `cli-paper-${crypto.randomUUID()}`,
          title: "CLI Paper Dry Run",
          summary: "Summary for paper dry-run review.",
          authors: ["A. Author"],
          publishedAt: "2024-01-01",
          url: "https://example.com/paper",
        },
        registryId: (slug: string) => `paper.${slug}`,
        route: (slug: string) => `/docs/papers/${slug}`,
      },
      {
        spec: {
          kind: "training-regime",
          slug: `cli-training-${crypto.randomUUID()}`,
          title: "CLI Training Dry Run",
          summary: "Summary for training dry-run review.",
          regimeType: "pretraining",
        },
        registryId: (slug: string) => `training-regime.${slug}`,
        route: (slug: string) => `/docs/training/${slug}`,
      },
    ] as const;

    try {
      for (const testCase of cases) {
        const specPath = join(tempRoot, `${testCase.spec.kind}-page-spec.json`);
        await writeFile(specPath, JSON.stringify(testCase.spec));

        const result = await runGeneratePageBundleCli({
          specPath,
          dryRun: true,
          projectRoot: tempRoot,
        });

        expect(result.dryRun).toBe(true);
        expect(result.plan).toContain(
          `Registry id: ${testCase.registryId(testCase.spec.slug)}`,
        );
        expect(result.plan).toContain(
          `Route: ${testCase.route(testCase.spec.slug)}`,
        );
        expect(result.plan).toContain("Planned files:");

        for (const line of result.plan.split("\n")) {
          if (!line.trim().startsWith("- ")) {
            continue;
          }
          const path = line
            .replace(/^\s*-\s+/, "")
            .replace(/\s+\([^)]+\)$/, "");
          expect(await pathExists(path)).toBe(false);
        }
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("dry-run prints deprecated taxonomy warnings for compatibility inputs", async () => {
    const tempRoot = await createFixtureRoot();
    const slug = `cli-warning-${crypto.randomUUID()}`;
    const specPath = join(tempRoot, "warning-page-spec.json");

    try {
      await writeFile(
        specPath,
        JSON.stringify({
          kind: "module",
          slug,
          title: "CLI Warning Module",
          summary: "Summary for warning review.",
          moduleType: "attention",
          moduleFamily: "attention",
          variantGroup: "attention-head-sharing",
        }),
      );

      const result = await runGeneratePageBundleCli({
        specPath,
        dryRun: true,
        projectRoot: tempRoot,
      });

      expect(result.plan).toContain("Warnings:");
      expect(result.plan).toContain(
        "moduleType is deprecated for module page specs",
      );
      expect(result.plan).toContain(
        "moduleFamily is deprecated for module page specs",
      );
      expect(result.plan).toContain(
        "variantGroup is deprecated for module page specs",
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("ontology-first dry-run stays warning-free for concept, module, training-regime, and system specs", async () => {
    const tempRoot = await createFixtureRoot();
    const cases = [
      {
        spec: {
          kind: "concept",
          slug: `cli-ontology-concept-${crypto.randomUUID()}`,
          title: "CLI Ontology Concept",
          summary: "Canonical concept dry-run review.",
          primaryClassificationId: "classification.concept.architecture",
        },
        registryId: (slug: string) => `concept.${slug}`,
        route: (slug: string) => `/docs/concepts/${slug}`,
      },
      {
        spec: {
          kind: "module",
          slug: `cli-ontology-module-${crypto.randomUUID()}`,
          title: "CLI Ontology Module",
          summary: "Canonical module dry-run review.",
          primaryClassificationId: "classification.module.attention",
        },
        registryId: (slug: string) => `module.${slug}`,
        route: (slug: string) => `/docs/modules/${slug}`,
      },
      {
        spec: {
          kind: "training-regime",
          slug: `cli-ontology-training-${crypto.randomUUID()}`,
          title: "CLI Ontology Training",
          summary: "Canonical training dry-run review.",
          primaryClassificationId: "classification.training.alignment",
        },
        registryId: (slug: string) => `training-regime.${slug}`,
        route: (slug: string) => `/docs/training/${slug}`,
      },
      {
        spec: {
          kind: "system",
          slug: `cli-ontology-system-${crypto.randomUUID()}`,
          title: "CLI Ontology System",
          summary: "Canonical system dry-run review.",
          primaryClassificationId: "classification.system.routing",
        },
        registryId: (slug: string) => `system.${slug}`,
        route: (slug: string) => `/docs/systems/${slug}`,
      },
    ] as const;

    try {
      for (const testCase of cases) {
        const specPath = join(tempRoot, `${testCase.spec.kind}-ontology.json`);
        await writeFile(specPath, JSON.stringify(testCase.spec));

        const result = await runGeneratePageBundleCli({
          specPath,
          dryRun: true,
          projectRoot: tempRoot,
        });

        expect(result.dryRun).toBe(true);
        expect(result.plan).toContain(
          `Registry id: ${testCase.registryId(testCase.spec.slug)}`,
        );
        expect(result.plan).toContain(
          `Route: ${testCase.route(testCase.spec.slug)}`,
        );
        expect(result.plan).not.toContain("Warnings:");
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generation CLI writes and validates expanded canonical kind bundles from committed sample specs", async () => {
    const tempRoot = await createFixtureRoot();
    const samplePaths = [
      "module-page-spec-workflow-sample.json",
      "model-page-spec-workflow-sample.json",
      "paper-page-spec-workflow-sample.json",
      "training-regime-page-spec-workflow-sample.json",
    ].map((filename) => join(getProjectRoot(), "page-specs", filename));

    const expectations = [
      {
        kind: "module",
        slug: "module-page-spec-workflow-sample",
        pageUrl: "/docs/modules/module-page-spec-workflow-sample",
        docsParent: "modules",
        registryParent: "modules",
      },
      {
        kind: "model",
        slug: "model-page-spec-workflow-sample",
        pageUrl: "/docs/models/model-page-spec-workflow-sample",
        docsParent: "models",
        registryParent: "models",
      },
      {
        kind: "paper",
        slug: "paper-page-spec-workflow-sample",
        pageUrl: "/docs/papers/paper-page-spec-workflow-sample",
        docsParent: "papers",
        registryParent: "papers",
      },
      {
        kind: "training-regime",
        slug: "training-regime-page-spec-workflow-sample",
        pageUrl: "/docs/training/training-regime-page-spec-workflow-sample",
        docsParent: "training",
        registryParent: "training-regimes",
      },
    ] as const;

    try {
      await seedExpandedKindValidationFixtures(tempRoot);

      for (const specPath of samplePaths) {
        const sampleSpec = JSON.parse(
          await readFile(specPath, "utf8"),
        ) as Record<string, unknown> & { kind: string; slug: string };
        const tempSpecPath = join(tempRoot, `${sampleSpec.slug}.spec.json`);
        await writeFile(tempSpecPath, JSON.stringify(sampleSpec));

        const result = await runGeneratePageBundleCli({
          specPath: tempSpecPath,
          projectRoot: tempRoot,
        });
        expect(result.dryRun).toBe(false);
        expect(result.plan).toContain("Written files:");
      }

      const indexes = await loadRegistry({
        registryRoot: join(tempRoot, "src", "content", "registry"),
      });

      for (const expected of expectations) {
        const pageDirectory = join(
          tempRoot,
          "src",
          "content",
          "docs",
          expected.docsParent,
          expected.slug,
        );
        const registryPath = join(
          tempRoot,
          "src",
          "content",
          "registry",
          expected.registryParent,
          `${expected.slug}.json`,
        );

        const errors = await validateGeneratedPageBundle({
          registryRoot: join(tempRoot, "src", "content", "registry"),
          docsRoot: join(tempRoot, "src", "content", "docs"),
          pageDirectory,
          registryPath,
          pageUrl: expected.pageUrl,
          indexes,
        });
        expect(errors).toEqual([]);
      }

      const registryErrors = await validateGeneratedPageBundleRegistryContent({
        registryRoot: join(tempRoot, "src", "content", "registry"),
        docsRoot: join(tempRoot, "src", "content", "docs"),
      });
      expect(registryErrors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("generation CLI compatibility fixtures keep deprecated taxonomy bridge behavior explicit", async () => {
    const tempRoot = await createFixtureRoot();
    const samplePaths = [
      "module-page-spec-workflow-sample.json",
      "training-regime-page-spec-workflow-sample.json",
    ].map((filename) => join(getProjectRoot(), "page-specs", filename));

    try {
      await seedExpandedKindCompatibilityFixtures(tempRoot);

      for (const specPath of samplePaths) {
        const sampleSpec = JSON.parse(
          await readFile(specPath, "utf8"),
        ) as Record<string, unknown> & { kind: string; slug: string };
        const compatibilitySpec = {
          ...sampleSpec,
          ...(sampleSpec.kind === "module" ? { moduleType: "attention" } : {}),
          ...(sampleSpec.kind === "training-regime"
            ? { regimeType: "alignment" }
            : {}),
        };
        const tempSpecPath = join(
          tempRoot,
          `${sampleSpec.slug}.compatibility.spec.json`,
        );
        await writeFile(tempSpecPath, JSON.stringify(compatibilitySpec));

        const result = await runGeneratePageBundleCli({
          specPath: tempSpecPath,
          projectRoot: tempRoot,
        });

        expect(result.dryRun).toBe(false);
        expect(result.plan).toContain("Written files:");
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("writes a concept bundle from a page-spec file", async () => {
    const tempRoot = await createFixtureRoot();
    const slug = `cli-write-${crypto.randomUUID()}`;
    const specPath = join(tempRoot, "page-spec.json");

    try {
      await writeFile(
        specPath,
        JSON.stringify({
          kind: "concept",
          slug,
          title: "CLI Write Concept",
          summary: "Summary written from page spec.",
          conceptType: "architecture",
          tags: ["attention"],
        }),
      );

      const result = await runGeneratePageBundleCli({
        specPath,
        projectRoot: tempRoot,
      });

      expect(result.dryRun).toBe(false);
      expect(result.plan).toContain("Written files:");

      const pagePath = join(
        tempRoot,
        "src",
        "content",
        "docs",
        "concepts",
        slug,
        "page.mdx",
      );
      const messagesPath = join(
        tempRoot,
        "src",
        "content",
        "docs",
        "concepts",
        slug,
        "messages",
        "en.json",
      );

      expect(await pathExists(pagePath)).toBe(true);
      expect(await pathExists(messagesPath)).toBe(true);

      const messages = JSON.parse(await readFile(messagesPath, "utf8")) as {
        title: string;
        description: string;
      };
      expect(messages.title).toBe("CLI Write Concept");
      expect(messages.description).toBe("Summary written from page spec.");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports invalid page spec input without writing files", async () => {
    const tempRoot = await createFixtureRoot();
    const specPath = join(tempRoot, "invalid-page-spec.json");

    try {
      await writeFile(
        specPath,
        JSON.stringify({
          kind: "concept",
          slug: "INVALID",
          title: "Bad Slug",
          summary: "Summary",
          conceptType: "general",
        }),
      );

      await expect(
        runGeneratePageBundleCli({
          specPath,
          projectRoot: tempRoot,
        }),
      ).rejects.toMatchObject({
        category: "invalid-input",
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("fails before writes when expanded canonical kinds are missing required fields", async () => {
    const tempRoot = await createFixtureRoot();
    const cases = [
      {
        filename: "invalid-module-page-spec.json",
        spec: {
          kind: "module",
          slug: "invalid-module",
          title: "Invalid Module",
          summary: "Summary",
        },
        expectedField: "moduleType",
      },
      {
        filename: "invalid-model-page-spec.json",
        spec: {
          kind: "model",
          slug: "invalid-model",
          title: "Invalid Model",
          summary: "Summary",
          sourceType: "open-weights",
        },
        expectedField: "family",
      },
      {
        filename: "invalid-paper-page-spec.json",
        spec: {
          kind: "paper",
          slug: "invalid-paper",
          title: "Invalid Paper",
          summary: "Summary",
          url: "https://example.com/paper",
        },
        expectedField: "authors",
      },
      {
        filename: "invalid-training-page-spec.json",
        spec: {
          kind: "training-regime",
          slug: "invalid-training",
          title: "Invalid Training",
          summary: "Summary",
        },
        expectedField: "regimeType",
      },
    ] as const;

    try {
      for (const testCase of cases) {
        const specPath = join(tempRoot, testCase.filename);
        await writeFile(specPath, JSON.stringify(testCase.spec));

        await expect(
          runGeneratePageBundleCli({
            specPath,
            projectRoot: tempRoot,
          }),
        ).rejects.toMatchObject({
          category: "invalid-input",
          message: expect.stringContaining(testCase.expectedField),
        });
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe("formatGeneratePageBundleUsage", () => {
  test("mentions page-spec command and dry-run", () => {
    const usage = formatGeneratePageBundleUsage();
    expect(usage).toContain("--spec");
    expect(usage).toContain("--dry-run");
    expect(usage).toContain("scaffold-doc-page");
    expect(usage).toContain("primaryClassificationId");
    expect(usage).toContain("Ontology-first example page spec");
  });
});

describe("committed page-spec workflow sample", () => {
  test("dry-run previews the sample route and paths without writing files", async () => {
    const specPath = join(
      getProjectRoot(),
      "page-specs",
      "page-spec-workflow-sample.json",
    );
    const result = await runGeneratePageBundleCli({
      specPath,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.plan).toContain(
      "Registry id: concept.page-spec-workflow-sample",
    );
    expect(result.plan).toContain(
      "Route: /docs/concepts/page-spec-workflow-sample",
    );
    expect(result.plan).toContain("page-spec-workflow-sample/page.mdx");
    expect(result.plan).toContain("Planned files:");
  });

  test("dry-run keeps the ontology-first sample free of deprecated taxonomy warnings", async () => {
    const specPath = join(
      getProjectRoot(),
      "page-specs",
      "page-spec-workflow-sample.json",
    );
    const result = await runGeneratePageBundleCli({
      specPath,
      dryRun: true,
    });

    expect(result.plan).not.toContain("Warnings:");
    expect(result.plan).not.toContain("deprecated");
  });
});
