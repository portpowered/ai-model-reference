import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "./content-paths";
import { generatePageBundle } from "./generate-page-bundle";
import { PAGE_SPEC_KINDS } from "./page-spec";
import { loadRegistry } from "./registry";
import { SCAFFOLD_DOC_PAGE_KINDS } from "./scaffold-doc-page";
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
  await mkdir(join(contentRoot, "registry", "tags"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "concepts"), { recursive: true });
  return contentRoot;
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
  });
});
