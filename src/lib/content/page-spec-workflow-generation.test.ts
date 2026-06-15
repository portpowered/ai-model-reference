import { describe, expect, test } from "bun:test";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "./content-paths";
import {
  GeneratePageBundleError,
  generatePageBundle,
} from "./generate-page-bundle";
import {
  PAGE_SPEC_KINDS,
  type PageSpec,
  type PageSpecKind,
  validatePageSpec,
} from "./page-spec";
import { loadRegistry } from "./registry";
import {
  formatScaffoldUsage,
  SCAFFOLD_DOC_PAGE_KINDS,
} from "./scaffold-doc-page";
import {
  validateGeneratedPageBundle,
  validateGeneratedPageBundleRegistryContent,
} from "./validate-generated-page-bundle";

const validTagRecord = {
  id: "tag.attention",
  slug: "attention",
  kind: "tag",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  category: "module-type",
  landingPage: "generated-tag-page",
};

async function createTemplateFixtureRoot(): Promise<string> {
  const tempRoot = join(
    import.meta.dir,
    "__workflow-generation-fixtures__",
    crypto.randomUUID(),
  );
  const { cp } = await import("node:fs/promises");
  await mkdir(join(tempRoot, "docs", "templates"), { recursive: true });
  await cp(
    join(getProjectRoot(), "docs", "templates"),
    join(tempRoot, "docs", "templates"),
    { recursive: true },
  );
  return tempRoot;
}

async function prepareContentRoots(tempRoot: string): Promise<string> {
  const contentRoot = join(tempRoot, "src", "content");
  await mkdir(join(contentRoot, "registry", "concepts"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "modules"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "models"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "papers"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "training-regimes"), {
    recursive: true,
  });
  await mkdir(join(contentRoot, "registry", "tags"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "graphs"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "glossary"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "concepts"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "modules"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "models"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "papers"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "training"), { recursive: true });
  return contentRoot;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const baseSpecFields = {
  title: "Generated Page",
  summary: "Reader-facing summary for cards and search.",
  openingSummary: "Folded opening summary for the page hero.",
  tags: ["attention"],
};

const knownModuleTableFixtureGaps = new Set([
  "unresolved-table-id",
  "unresolved-table-module-id",
  "missing-table-message-key",
]);

function validSpecForKind(kind: PageSpecKind, slug: string): PageSpec {
  switch (kind) {
    case "concept":
      return validatePageSpec({
        ...baseSpecFields,
        kind,
        slug,
        conceptType: "general",
      });
    case "glossary":
      return validatePageSpec({
        ...baseSpecFields,
        kind,
        slug,
        conceptType: "architecture",
      });
    case "module":
      return validatePageSpec({
        ...baseSpecFields,
        kind,
        slug,
        moduleType: "attention",
      });
    case "model":
      return validatePageSpec({
        ...baseSpecFields,
        kind,
        slug,
        family: "gpt",
        sourceType: "open-weights",
        modalities: ["text"],
      });
    case "paper":
      return validatePageSpec({
        ...baseSpecFields,
        kind,
        slug,
        authors: ["A. Author"],
        publishedAt: "2024-01-01",
        url: "https://example.com/paper",
      });
    case "training-regime":
      return validatePageSpec({
        ...baseSpecFields,
        kind,
        slug,
        regimeType: "pretraining",
      });
  }
}

function docsParentForKind(kind: PageSpecKind): string {
  switch (kind) {
    case "glossary":
      return "glossary";
    case "concept":
      return "concepts";
    case "module":
      return "modules";
    case "model":
      return "models";
    case "paper":
      return "papers";
    case "training-regime":
      return "training";
  }
}

function registryDirectoryForKind(kind: PageSpecKind): string {
  switch (kind) {
    case "concept":
    case "glossary":
      return "concepts";
    case "module":
      return "modules";
    case "model":
      return "models";
    case "paper":
      return "papers";
    case "training-regime":
      return "training-regimes";
  }
}

describe("page-spec workflow generation", () => {
  test("generates graph registry records so registry validation passes without hand-authored graph fixtures", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "auto-graph-gap";

    try {
      await writeFile(
        join(contentRoot, "registry", "tags", "attention.json"),
        JSON.stringify(validTagRecord),
      );

      await generatePageBundle({
        spec: {
          kind: "concept",
          slug,
          title: "Auto Graph Gap",
          summary: "Proves the generator emits graph registry records.",
          conceptType: "general",
          tags: ["attention"],
        },
        projectRoot: tempRoot,
      });

      const pageDir = join(contentRoot, "docs", "concepts", slug);
      const registryPath = join(
        contentRoot,
        "registry",
        "concepts",
        `${slug}.json`,
      );
      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });

      const bundleErrors = await validateGeneratedPageBundle({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        pageDirectory: pageDir,
        registryPath,
        pageUrl: `/docs/concepts/${slug}`,
        indexes,
      });
      expect(
        bundleErrors.filter((error) => error.code === "unresolved-graph-id"),
      ).toEqual([]);

      const registryErrors = await validateGeneratedPageBundleRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
      });
      expect(
        registryErrors.filter((error) => error.code === "unresolved-graph-id"),
      ).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("legacy scaffold kinds remain a strict subset of page-spec kinds", () => {
    for (const kind of SCAFFOLD_DOC_PAGE_KINDS) {
      expect(PAGE_SPEC_KINDS).toContain(kind);
    }
    expect(SCAFFOLD_DOC_PAGE_KINDS).toEqual(["glossary", "concept"]);
    expect(PAGE_SPEC_KINDS.length).toBeGreaterThan(
      SCAFFOLD_DOC_PAGE_KINDS.length,
    );
    expect(formatScaffoldUsage()).toContain("generate-page-bundle.ts");
  });

  test("generates canonical bundles for every page-spec kind", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);

    try {
      await writeFile(
        join(contentRoot, "registry", "tags", "attention.json"),
        JSON.stringify(validTagRecord),
      );

      for (const kind of PAGE_SPEC_KINDS) {
        const slug = `parity-${kind}`;
        const spec = validSpecForKind(kind, slug);
        const result = await generatePageBundle({
          spec,
          projectRoot: tempRoot,
        });

        expect(result.writtenFiles).toHaveLength(5);
        expect(result.plannedFiles.map((file) => file.label)).toEqual(
          expect.arrayContaining([
            "registry record",
            "page.mdx",
            "messages/en.json",
            "assets.json",
          ]),
        );
        expect(
          result.plannedFiles.some((file) =>
            file.label.includes("graph registry"),
          ),
        ).toBe(true);

        const docsParent = docsParentForKind(kind);
        const registryDir = registryDirectoryForKind(kind);
        const pageDir = join(contentRoot, "docs", docsParent, slug);
        const registryPath = join(
          contentRoot,
          "registry",
          registryDir,
          `${slug}.json`,
        );

        expect(await pathExists(join(pageDir, "page.mdx"))).toBe(true);
        expect(await pathExists(join(pageDir, "messages", "en.json"))).toBe(
          true,
        );
        expect(await pathExists(join(pageDir, "assets.json"))).toBe(true);
        expect(await pathExists(registryPath)).toBe(true);

        const registryRecord = JSON.parse(
          await readFile(registryPath, "utf8"),
        ) as { id: string; kind: string };
        expect(registryRecord.id).toBe(result.registryId);
        if (kind === "glossary") {
          expect(registryRecord.kind).toBe("concept");
        } else {
          expect(registryRecord.kind).toBe(kind);
        }

        const indexes = await loadRegistry({
          registryRoot: join(contentRoot, "registry"),
        });
        const bundleErrors = await validateGeneratedPageBundle({
          registryRoot: join(contentRoot, "registry"),
          docsRoot: join(contentRoot, "docs"),
          pageDirectory: pageDir,
          registryPath,
          pageUrl: result.route,
          indexes,
        });
        const unexpectedErrors = bundleErrors.filter((error) => {
          if (kind !== "module") {
            return true;
          }
          return !knownModuleTableFixtureGaps.has(error.code);
        });
        expect(unexpectedErrors).toEqual([]);
      }

      const registryErrors = await validateGeneratedPageBundleRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
      });
      expect(
        registryErrors.filter((error) => error.code === "unresolved-graph-id"),
      ).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("refuses partial writes when kind-specific validation fails before file writes", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "invalid-module-spec";

    try {
      await expect(
        generatePageBundle({
          spec: {
            ...baseSpecFields,
            slug,
            kind: "module",
          },
          projectRoot: tempRoot,
        }),
      ).rejects.toThrow();

      const pageDir = join(contentRoot, "docs", "modules", slug);
      expect(await pathExists(pageDir)).toBe(false);
      expect(
        await pathExists(
          join(contentRoot, "registry", "modules", `${slug}.json`),
        ),
      ).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("refuses to overwrite existing bundle files on path collision", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "overwrite-guard-parity";
    const spec = validSpecForKind("concept", slug);

    try {
      await generatePageBundle({ spec, projectRoot: tempRoot });

      await expect(
        generatePageBundle({ spec, projectRoot: tempRoot }),
      ).rejects.toThrow(GeneratePageBundleError);

      const pageDir = join(contentRoot, "docs", "concepts", slug);
      expect(await pathExists(join(pageDir, "page.mdx"))).toBe(true);
      expect(
        await pathExists(
          join(contentRoot, "registry", "concepts", `${slug}.json`),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
