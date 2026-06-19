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
  await mkdir(join(tempRoot, "src", "content", "registry", "modules"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "models"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "papers"), {
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
});
