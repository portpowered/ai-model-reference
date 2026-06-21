import { describe, expect, test } from "bun:test";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSearchDocument } from "@/lib/search/build-documents";
import { getProjectRoot } from "./content-paths";
import { generatePageBundle } from "./generate-page-bundle";
import { loadPageAssets } from "./page-assets-load";
import { loadPageMessages } from "./page-messages-load";
import { loadRegistry } from "./registry";
import {
  parseGeneratedRegistryRecord,
  validateGeneratedPageBundle,
  validateGeneratedPageBundleRegistryContent,
  validateGeneratedSearchText,
  validateRegistryFrontmatterAlignment,
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

const baseSpecFields = {
  slug: "generated-page",
  title: "Generated Page",
  summary: "Reader-facing summary for cards and search.",
};

async function expectGeneratedGraphRecord(input: {
  contentRoot: string;
  graphId: string;
  subjectId: string;
  slugSuffix: string;
}): Promise<void> {
  const graphRecord = JSON.parse(
    await readFile(
      join(input.contentRoot, "registry", "graphs", `${input.slugSuffix}.json`),
      "utf8",
    ),
  ) as { id: string; subjectId: string };
  expect(graphRecord.id).toBe(input.graphId);
  expect(graphRecord.subjectId).toBe(input.subjectId);
}

async function createTemplateFixtureRoot(): Promise<string> {
  const tempRoot = join(
    import.meta.dir,
    "__validate-bundle-fixtures__",
    crypto.randomUUID(),
  );
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
  await mkdir(join(contentRoot, "registry", "tables"), { recursive: true });
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

async function writeTagFixture(contentRoot: string): Promise<void> {
  await writeFile(
    join(contentRoot, "registry", "tags", "attention.json"),
    JSON.stringify(validTagRecord),
  );
}

async function writeCitationFixture(contentRoot: string): Promise<void> {
  await mkdir(join(contentRoot, "registry", "citations"), { recursive: true });
  await writeFile(
    join(contentRoot, "registry", "citations", "generated-module-ref.json"),
    JSON.stringify({
      id: "citation.generated-module-ref",
      slug: "generated-module-ref",
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
      authors: ["A. Author"],
      title: "Generated Module Reference",
      url: "https://example.com/generated-module-reference",
      mla: 'Author, A. "Generated Module Reference." Example, 2024.',
      year: 2024,
    }),
  );
}

async function writeModuleFixture(
  contentRoot: string,
  input: { slug: string; aliases?: string[] },
): Promise<void> {
  await writeFile(
    join(contentRoot, "registry", "modules", `${input.slug}.json`),
    JSON.stringify({
      id: `module.${input.slug}`,
      slug: input.slug,
      kind: "module",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: input.aliases ?? [],
      tags: ["attention"],
      relatedIds: [],
      citationIds: ["citation.generated-module-ref"],
      status: "published",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      releaseDate: "2024-01-01",
      authors: ["A. Author"],
      sourceId: "citation.generated-module-ref",
      moduleType: "attention",
      optimizes: [],
      exampleModelIds: [],
      improvesOnIds: [],
      tradeoffIds: [],
      usedByModelIds: [],
      introducedByPaperIds: [],
      mathLevel: "light",
    }),
  );
}

describe("validateGeneratedPageBundle", () => {
  test("glossary bundle loads through standard loaders and passes registry validation", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-glossary-alignment";
    const registryId = `concept.${slug}`;
    const graphId = `graph.${slug}-concept-map`;

    try {
      await writeTagFixture(contentRoot);

      await generatePageBundle({
        spec: {
          ...baseSpecFields,
          slug,
          kind: "glossary",
          conceptType: "architecture",
          tags: ["attention"],
          aliases: ["generated alias"],
          relatedIds: [],
          sections: {
            whatItIs: {
              title: "What It Is",
              body: "Glossary body from page spec.",
            },
          },
        },
        projectRoot: tempRoot,
        updatedAt: "2026-06-11",
      });

      const pageDir = join(contentRoot, "docs", "glossary", slug);
      const registryPath = join(
        contentRoot,
        "registry",
        "concepts",
        `${slug}.json`,
      );
      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });

      const messages = await loadPageMessages(pageDir, "en");
      const assets = await loadPageAssets(pageDir);
      expect(messages.title).toBe("Generated Page");
      expect(assets.conceptMap?.type).toBe("graph");
      await expectGeneratedGraphRecord({
        contentRoot,
        graphId,
        subjectId: registryId,
        slugSuffix: `${slug}-concept-map`,
      });

      const registryRecord = parseGeneratedRegistryRecord(
        JSON.parse(await readFile(registryPath, "utf8")),
      );
      expect(registryRecord.defaultTitleKey).toBe("title");
      expect(registryRecord.defaultSummaryKey).toBe("description");
      expect(registryRecord.aliases).toEqual(["generated alias"]);

      const errors = await validateGeneratedPageBundle({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        pageDirectory: pageDir,
        registryPath,
        pageUrl: `/docs/glossary/${slug}`,
        indexes,
      });
      expect(errors).toEqual([]);

      const registryErrors = await validateGeneratedPageBundleRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
      });
      expect(registryErrors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("concept bundle preserves relatedIds and citationIds when registry references resolve", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-concept-relationships";
    const relatedConceptId = "concept.related-peer";
    const citationId = "citation.generated-paper";

    try {
      await writeTagFixture(contentRoot);
      await writeFile(
        join(contentRoot, "registry", "concepts", "related-peer.json"),
        JSON.stringify({
          id: relatedConceptId,
          slug: "related-peer",
          kind: "concept",
          defaultTitleKey: "title",
          defaultSummaryKey: "description",
          aliases: [],
          tags: ["attention"],
          relatedIds: [],
          citationIds: [],
          status: "published",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
          conceptType: "general",
          prerequisiteIds: [],
          explainsIds: [],
        }),
      );
      await mkdir(join(contentRoot, "registry", "citations"), {
        recursive: true,
      });
      await writeFile(
        join(contentRoot, "registry", "citations", "generated-paper.json"),
        JSON.stringify({
          id: citationId,
          slug: "generated-paper",
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
          authors: ["A. Author"],
          title: "Generated Paper",
          url: "https://example.com/paper",
          mla: 'Author, A. "Generated Paper." Example, 2024.',
          year: 2024,
        }),
      );

      await generatePageBundle({
        spec: {
          ...baseSpecFields,
          slug,
          kind: "concept",
          conceptType: "math",
          tags: ["attention"],
          relatedIds: [relatedConceptId],
          citationIds: [citationId],
        },
        projectRoot: tempRoot,
        updatedAt: "2026-06-11",
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
      const registryRecord = parseGeneratedRegistryRecord(
        JSON.parse(await readFile(registryPath, "utf8")),
      );

      expect(registryRecord.relatedIds).toEqual([relatedConceptId]);
      expect(registryRecord.citationIds).toEqual([citationId]);

      const errors = await validateGeneratedPageBundle({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        pageDirectory: pageDir,
        registryPath,
        pageUrl: `/docs/concepts/${slug}`,
        indexes,
      });
      expect(errors).toEqual([]);

      const registryErrors = await validateGeneratedPageBundleRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
      });
      expect(registryErrors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("concept bundle aligns registry record with frontmatter and message keys", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-concept-alignment";

    try {
      await writeTagFixture(contentRoot);

      await generatePageBundle({
        spec: {
          ...baseSpecFields,
          slug,
          kind: "concept",
          conceptType: "math",
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
      const messages = await loadPageMessages(pageDir, "en");
      const mdxSource = await readFile(join(pageDir, "page.mdx"), "utf8");
      const frontmatterMatch = mdxSource.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(frontmatterMatch?.[1]).toBeDefined();

      const registryRecord = parseGeneratedRegistryRecord(
        JSON.parse(await readFile(registryPath, "utf8")),
      );
      const { parseYamlFrontmatterBlock } = await import("./yaml-frontmatter");
      const { pageFrontmatterSchema } = await import("./schemas");
      const frontmatter = pageFrontmatterSchema.parse(
        parseYamlFrontmatterBlock(frontmatterMatch?.[1] ?? ""),
      );

      expect(
        validateRegistryFrontmatterAlignment(
          registryRecord,
          frontmatter,
          messages,
          pageDir,
        ),
      ).toEqual([]);

      const searchErrors = validateGeneratedSearchText(
        messages,
        frontmatter,
        `/docs/concepts/${slug}`,
        indexes,
      );
      expect(searchErrors).toEqual([]);

      const searchDocument = buildSearchDocument(
        {
          pageDir,
          docsSlug: `concepts/${slug}`,
          url: `/docs/concepts/${slug}`,
          frontmatter,
          messages,
        },
        indexes,
      );
      expect(searchDocument.title).toBe(messages.title);
      expect(searchDocument.description).toBe(messages.description);
      expect(searchDocument.bodyText).not.toContain("Folded opening summary");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("module bundle aligns registry fields and resolves search text from messages", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-module-alignment";

    try {
      await writeTagFixture(contentRoot);
      await writeCitationFixture(contentRoot);
      await writeModuleFixture(contentRoot, {
        slug: "multi-head-attention",
        aliases: ["MHA"],
      });
      await writeModuleFixture(contentRoot, {
        slug: "multi-query-attention",
        aliases: ["MQA"],
      });
      await writeFile(
        join(contentRoot, "registry", "tables", `${slug}-comparison.json`),
        JSON.stringify({
          id: `table.${slug}-comparison`,
          subjectId: `module.${slug}`,
          columns: [
            {
              moduleId: `module.${slug}`,
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
            [`module.${slug}`]: {
              cacheFootprint:
                "tables.comparison.values.generated.cacheFootprint",
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

      await generatePageBundle({
        spec: {
          ...baseSpecFields,
          slug,
          kind: "module",
          moduleType: "attention",
          tags: ["attention"],
          optimizes: ["kv-cache"],
          assets: {
            comparisonTable: {
              type: "table",
              tableId: `table.${slug}-comparison`,
            },
          },
          tables: {
            comparison: {
              columns: {
                generated: {
                  title: "Generated Module",
                },
                mha: {
                  title: "MHA",
                },
                mqa: {
                  title: "MQA",
                },
              },
              dimensions: {
                cacheFootprint: "Cache footprint",
              },
              values: {
                generated: {
                  cacheFootprint: "Shared KV heads reduce cache growth.",
                },
                mha: {
                  cacheFootprint: "Each query head keeps its own KV pair.",
                },
                mqa: {
                  cacheFootprint: "One KV head serves all query heads.",
                },
              },
            },
          },
        },
        projectRoot: tempRoot,
      });

      const pageDir = join(contentRoot, "docs", "modules", slug);
      const registryPath = join(
        contentRoot,
        "registry",
        "modules",
        `${slug}.json`,
      );
      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });
      const messages = await loadPageMessages(pageDir, "en");
      const assets = await loadPageAssets(pageDir);

      expect(messages.title).toBe("Generated Page");
      expect(assets.computeFlow?.type).toBe("graph");

      const errors = await validateGeneratedPageBundle({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        pageDirectory: pageDir,
        registryPath,
        pageUrl: `/docs/modules/${slug}`,
        indexes,
      });
      expect(errors).toEqual([]);

      const registryErrors = await validateGeneratedPageBundleRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
      });
      expect(registryErrors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("model, paper, and training-regime registry records parse and align with generated bundles", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);

    const cases = [
      {
        kind: "model" as const,
        slug: "generated-model-alignment",
        spec: {
          ...baseSpecFields,
          slug: "generated-model-alignment",
          kind: "model" as const,
          family: "gpt",
          sourceType: "open-weights" as const,
          modalities: ["text" as const],
          tags: ["attention"],
        },
        pageUrl: "/docs/models/generated-model-alignment",
        graphSuffix: "architecture",
      },
      {
        kind: "paper" as const,
        slug: "generated-paper-alignment",
        spec: {
          ...baseSpecFields,
          slug: "generated-paper-alignment",
          kind: "paper" as const,
          authors: ["A. Author"],
          publishedAt: "2024-01-01",
          url: "https://example.com/paper",
          tags: ["attention"],
        },
        pageUrl: "/docs/papers/generated-paper-alignment",
        graphSuffix: "contribution",
      },
      {
        kind: "training-regime" as const,
        slug: "generated-training-alignment",
        spec: {
          ...baseSpecFields,
          slug: "generated-training-alignment",
          kind: "training-regime" as const,
          regimeType: "pretraining" as const,
          tags: ["attention"],
        },
        pageUrl: "/docs/training/generated-training-alignment",
        graphSuffix: "training-flow",
      },
    ];

    try {
      await writeTagFixture(contentRoot);

      for (const testCase of cases) {
        await generatePageBundle({
          spec: testCase.spec,
          projectRoot: tempRoot,
        });
      }

      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });

      for (const testCase of cases) {
        const docsParent =
          testCase.kind === "training-regime"
            ? "training"
            : `${testCase.kind}s`;
        const registryDir =
          testCase.kind === "training-regime"
            ? "training-regimes"
            : `${testCase.kind}s`;
        const pageDir = join(contentRoot, "docs", docsParent, testCase.slug);
        const registryPath = join(
          contentRoot,
          "registry",
          registryDir,
          `${testCase.slug}.json`,
        );

        const registryRecord = parseGeneratedRegistryRecord(
          JSON.parse(await readFile(registryPath, "utf8")),
        );
        expect(registryRecord.kind).toBe(testCase.kind);
        expect(registryRecord.defaultTitleKey).toBe("title");
        expect(registryRecord.defaultSummaryKey).toBe("description");
        expect(indexes.byId.get(registryRecord.id)?.kind).toBe(testCase.kind);

        const messages = await loadPageMessages(pageDir, "en");
        const mdxSource = await readFile(join(pageDir, "page.mdx"), "utf8");
        const frontmatterMatch = mdxSource.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        expect(frontmatterMatch?.[1]).toBeDefined();
        const { parseYamlFrontmatterBlock } = await import(
          "./yaml-frontmatter"
        );
        const { pageFrontmatterSchema } = await import("./schemas");
        const frontmatter = pageFrontmatterSchema.parse(
          parseYamlFrontmatterBlock(frontmatterMatch?.[1] ?? ""),
        );

        const searchDocument = buildSearchDocument(
          {
            pageDir,
            docsSlug: `${docsParent}/${testCase.slug}`,
            url: testCase.pageUrl,
            frontmatter,
            messages,
          },
          indexes,
        );
        expect(searchDocument.relatedIds).toEqual(registryRecord.relatedIds);
        expect(searchDocument.facets.kind).toBe(testCase.kind);

        const errors = await validateGeneratedPageBundle({
          registryRoot: join(contentRoot, "registry"),
          docsRoot: join(contentRoot, "docs"),
          pageDirectory: pageDir,
          registryPath,
          pageUrl: testCase.pageUrl,
          indexes,
        });
        expect(errors).toEqual([]);
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
