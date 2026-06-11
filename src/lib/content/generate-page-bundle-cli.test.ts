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
  await mkdir(join(tempRoot, "src", "content", "docs", "concepts"), {
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
});

describe("formatGeneratePageBundleUsage", () => {
  test("mentions page-spec command and dry-run", () => {
    const usage = formatGeneratePageBundleUsage();
    expect(usage).toContain("--spec");
    expect(usage).toContain("--dry-run");
    expect(usage).toContain("scaffold-doc-page");
  });
});
